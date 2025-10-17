import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { ILocationTracker, ILocationTrackerFilters, ICreateLocationTracker, ILocationTrackerStats, ILocationStatus, ILocationScanData } from './location-trackers.interface';
import { locationTrackingRedis } from '../../../services/locationTrackingRedis';
import { getBangladeshTimeISO } from '../../../shared/timezone';

// Get socket instance dynamically to avoid import issues
const getSocketInstance = () => {
  try {
    const serverModule = require('../../../server');
    return serverModule.io;
  } catch (error) {
    console.log('Socket.IO not available yet');
    return null;
  }
};

// Process location scan and create/update location tracker record
const processLocationScan = async (scanData: ILocationScanData): Promise<ILocationTracker | null> => {
  if (!scanData?.epc || !scanData?.deviceId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'EPC and deviceId are required');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Normalize user_id from reader value if needed
    if (!scanData.user_id && typeof scanData.value === 'number') {
      scanData.user_id = scanData.value;
    }

    // Note: location_code column was removed from location_tracker table
    // We'll use deviceId as a reference but not store it in the table
    const location_name = `Device ${scanData.deviceId}`;

    const hexCodeQuery = `
      SELECT po_number, lot_no, item_number, quantity
      FROM po_hex_codes
      WHERE hex_code = $1
      LIMIT 1;
    `;
    const hexCodeResult = await client.query(hexCodeQuery, [scanData.epc]);

    if (hexCodeResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, `EPC "${scanData.epc}" not found in po_hex_codes`);
    }

    const { po_number, item_number, quantity } = hexCodeResult.rows[0];

    // Step 3️⃣: Check Redis for 30-second cooldown (scoped to EPC+PO+Item+User)
    const compositeKey = `${scanData.epc}|${po_number}|${item_number}|${scanData.user_id || ''}`;
    const cooldownCheck = await locationTrackingRedis.canProcessScan(
      compositeKey
    );

    let shouldCreateRecord = false;
    let newStatus: 'in' | 'out' = 'in';
    let trackerRecord!: ILocationTracker;

    if (cooldownCheck.canProcess) {
      // Extra safety: enforce 30s cooldown from DB if Redis is unavailable or missed the key
      const recentRecordQuery = `
        SELECT id, status, created_at
        FROM location_tracker
        WHERE epc = $1 AND po_number = $2 AND item_number = $3 AND user_id ${scanData.user_id ? '= $4' : 'IS NULL'}
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      const recentRecordParams: any[] = [scanData.epc, po_number, item_number];
      if (scanData.user_id) recentRecordParams.push(scanData.user_id);
      const recentRecordResult = await client.query(recentRecordQuery, recentRecordParams);
      if (recentRecordResult.rows.length > 0) {
        const last = recentRecordResult.rows[0];
        const lastCreatedAt = new Date(last.created_at);
        const secondsSinceLast = Math.floor((Date.now() - lastCreatedAt.getTime()) / 1000);
        if (secondsSinceLast < 60) {
          // Within 60 seconds → skip creating new record
          shouldCreateRecord = false;
          trackerRecord = {
            id: last.id,
            po_number,
            item_number,
            quantity,
            status: last.status,
            epc: scanData.epc,
            user_id: scanData.user_id,
            created_at: last.created_at,
            updated_at: last.created_at,
          } as ILocationTracker;
          console.log(`🚫 DB: Composite ${compositeKey} within 60s (${secondsSinceLast}s) → skipping insert`);
          // Short-circuit: skip toggle/insert path entirely
        }
      }

      if (!trackerRecord) {
        // Can process the scan - check database for last status if Redis doesn't have it
        let lastStatus = cooldownCheck.lastStatus;
        
        if (!lastStatus) {
          // Get last status from database for this composite
          const lastRecordQuery = `
            SELECT status, created_at
            FROM location_tracker
            WHERE epc = $1 AND po_number = $2 AND item_number = $3 AND user_id ${scanData.user_id ? '= $4' : 'IS NULL'}
            ORDER BY created_at DESC
            LIMIT 1;
          `;
          const lastParams: any[] = [scanData.epc, po_number, item_number];
          if (scanData.user_id) lastParams.push(scanData.user_id);
          const lastRecordResult = await client.query(lastRecordQuery, lastParams);

          if (lastRecordResult.rows.length > 0) {
            lastStatus = lastRecordResult.rows[0].status;
            console.log(`📊 Database: Found last status (composite) = ${lastStatus}`);
          }
        }

        if (lastStatus) {
          // Toggle status from last known status
          newStatus = lastStatus === 'in' ? 'out' : 'in';
          console.log(`🔄 Status Toggle: ${lastStatus} → ${newStatus}`);
        } else {
          // First time scan, default to 'in'
          newStatus = 'in';
          console.log('✨ First scan → creating "in" record');
        }
        shouldCreateRecord = true;
      }
    } else {
      // Still in cooldown period
      shouldCreateRecord = false;
      newStatus = cooldownCheck.lastStatus || 'in';
      console.log(`🚫 Within 60s cooldown → skipping (${cooldownCheck.timeRemaining}s remaining, last status: ${cooldownCheck.lastStatus})`);
      
      // Get the last record from database for response
      const lastRecordQuery = `
        SELECT id, status, created_at
        FROM location_tracker
        WHERE epc = $1 AND po_number = $2 AND item_number = $3 AND user_id ${scanData.user_id ? '= $4' : 'IS NULL'}
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      const lastParams: any[] = [scanData.epc, po_number, item_number];
      if (scanData.user_id) lastParams.push(scanData.user_id);
      const lastRecordResult = await client.query(lastRecordQuery, lastParams);

      if (lastRecordResult.rows.length > 0) {
        const last = lastRecordResult.rows[0];
        trackerRecord = {
          id: last.id,
          po_number,
          item_number,
          quantity,
          status: last.status,
          epc: scanData.epc,
          user_id: scanData.user_id,
          created_at: last.created_at,
          updated_at: last.created_at
        } as ILocationTracker;
      }
    }

    // Step 4️⃣: Insert new record if needed
    if (shouldCreateRecord) {
      const insertQuery = `
        INSERT INTO location_tracker (
          po_number, item_number, quantity, status, epc, user_id, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *;
      `;
      const insertResult = await client.query(insertQuery, [
        po_number,
        item_number,
        quantity,
        newStatus,
        scanData.epc,
        scanData.user_id || null,
        getBangladeshTimeISO()
      ]);
      trackerRecord = insertResult.rows[0];
      console.log(`✅ Inserted → ID=${trackerRecord.id}, status=${trackerRecord.status}`);
      
      // Record the scan in Redis for cooldown tracking with composite key
      await locationTrackingRedis.recordScan(
        compositeKey,
        newStatus
      );
    }

    await client.query('COMMIT');

    // Step 5️⃣: Emit socket event only for new records
    if (shouldCreateRecord && trackerRecord?.id) {
      const io = getSocketInstance?.();
      if (io) {
        // Resolve location name from users table by user_id
        let userLocationName: string | undefined;
        if (trackerRecord.user_id) {
          try {
            const userRes = await pool.query('SELECT name FROM users WHERE id = $1 LIMIT 1', [trackerRecord.user_id]);
            userLocationName = userRes.rows[0]?.name;
          } catch (e) {
            const err: any = e;
            console.log('ℹ️ Could not resolve user name for location:', err?.message || err);
          }
        }

        const activityText = `${trackerRecord.item_number} ${trackerRecord.status.toUpperCase()} (EPC: ${trackerRecord.epc})`;
        io.emit('location-tracker:new-activity', {
          id: trackerRecord.id,
          po_number: trackerRecord.po_number,
          item_number: trackerRecord.item_number,
          quantity: trackerRecord.quantity,
          status: trackerRecord.status,
          epc: trackerRecord.epc,
          user_id: trackerRecord.user_id,
          location_name: userLocationName,
          created_at: trackerRecord.created_at,
          timestamp: getBangladeshTimeISO(),
          activity_text: activityText,
        });
        console.log(`📡 [Socket] Emitted: ${activityText}`);
      }
    } else {
      console.log('ℹ️ No socket emit — skipped within 30s');
    }

    return trackerRecord;
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ [LocationScan] Error:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  } finally {
    client.release();
  }
};





const createLocationTracker = async (data: ICreateLocationTracker): Promise<ILocationTracker> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Note: location_code column was removed from location_tracker table
    // No need to check location existence since we're not storing it

    let shouldCreateRecord = true;
    let newStatus: 'in' | 'out' = data.status;

    // Check if same EPC, po_number, and item_number combination already exists
    if (data.epc) {
      const existingEpcQuery = `
        SELECT status, created_at 
        FROM location_tracker 
        WHERE epc = $1 AND po_number = $2 AND item_number = $3
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const existingEpcResult = await client.query(existingEpcQuery, [
        data.epc,
        data.po_number,
        data.item_number
      ]);

      if (existingEpcResult.rows.length > 0) {
        const lastRecord = existingEpcResult.rows[0];
        const timeDiff = Date.now() - new Date(lastRecord.created_at).getTime();

        if (timeDiff < 30000) {
          // Less than 30 seconds - don't create new entry, item still in same status
          console.log(`⏱️ Same EPC combination exists <30s ago - skipping new entry. Item remains "${lastRecord.status}"`);
          shouldCreateRecord = false;
          newStatus = lastRecord.status;
        } else {
          // More than 30 seconds - toggle the status (in -> out, out -> in)
          newStatus = lastRecord.status === 'in' ? 'out' : 'in';
          console.log(`🔄 Same EPC combination >30s ago - toggling status: ${lastRecord.status} → ${newStatus} for EPC ${data.epc}`);
          console.log(`⏰ Time difference: ${timeDiff}ms (${Math.round(timeDiff / 1000)}s)`);
          shouldCreateRecord = true; // We need to create a new record with the toggled status
        }
      } else {
        // No existing EPC combination - create new entry with requested status
        console.log(`✨ New EPC combination - creating "${data.status}" entry for EPC ${data.epc}`);
      }
    } else {
      // Legacy logic for non-EPC tracking
      const recentCheck = await client.query(`
        SELECT status, created_at 
        FROM location_tracker 
        WHERE po_number = $1 AND item_number = $2
        ORDER BY created_at DESC 
        LIMIT 1
      `, [data.po_number, data.item_number]);

      if (recentCheck.rows.length > 0) {
        const lastRecord = recentCheck.rows[0];
        const timeDiff = Date.now() - new Date(lastRecord.created_at).getTime();
        // If last post was 30s ago or more, toggle the status; otherwise keep requested
        if (timeDiff >= 30000) {
          newStatus = lastRecord.status === 'in' ? 'out' : 'in';
          console.log(`🔄 Status toggled (>=30s) for EPC ${data.epc}: ${lastRecord.status} → ${newStatus}`);
        } else {
          console.log(`⏱️ Last activity <30s; keeping requested status: ${newStatus}`);
        }
      }
    }

    let trackerRecord: ILocationTracker;

    if (shouldCreateRecord) {
      // Create new tracker record with UPSERT logic
      try {
        // First, try to delete any existing record with the same EPC combination but different status
        if (data.epc) {
          const deleteQuery = `
            DELETE FROM location_tracker 
            WHERE epc = $1 AND po_number = $2 AND item_number = $3
          `;
          await client.query(deleteQuery, [
            data.epc,
            data.po_number,
            data.item_number
          ]);
          console.log(`🗑️ Deleted existing records for EPC combination`);
        }

        const insertQuery = `
          INSERT INTO location_tracker (po_number, item_number, quantity, status, epc, user_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
          RETURNING *;
        `;

        console.log('📝 [LocationTracker] Inserting row with computed status:', newStatus);
        const result = await client.query(insertQuery, [
          data.po_number,
          data.item_number,
          data.quantity,
          newStatus,
          data.epc || null,
          data.user_id || null,
          getBangladeshTimeISO()
        ]);

        trackerRecord = result.rows[0];
        console.log(`✅ [LocationTracker] Record created with ID: ${trackerRecord.id}`);
      } catch (insertError: any) {
        console.error('❌ [LocationTracker] Insert failed:', insertError);
        throw insertError;
      }
    } else {
      // Return existing record info without creating new entry
      trackerRecord = {
        id: 0, // Indicates no new record created
        po_number: data.po_number,
        item_number: data.item_number,
        quantity: data.quantity,
        status: newStatus,
        epc: data.epc,
        user_id: data.user_id,
        created_at: new Date(getBangladeshTimeISO()),
        updated_at: new Date(getBangladeshTimeISO())
      };

      console.log(`ℹ️ No new location tracker created - item remains "${newStatus}" for EPC ${data.epc}`);
    }

    await client.query('COMMIT');

    console.log('✅ [LocationTracker] Insert successful:', {
      id: trackerRecord.id,
      po_number: trackerRecord.po_number,
      item_number: trackerRecord.item_number,
      quantity: trackerRecord.quantity,
      status: trackerRecord.status,
      epc: trackerRecord.epc,
      user_id: trackerRecord.user_id,
      created_at: trackerRecord.created_at,
    });

    // Emit live update via socket with human-readable text (only for new records)
    if (
      shouldCreateRecord &&
      trackerRecord &&
      typeof trackerRecord.id === 'number' &&
      trackerRecord.id > 0
    ) {
      try {
        const io = getSocketInstance();
        if (io) {
          const activity_text = `${trackerRecord.item_number} ${String(trackerRecord.status).toUpperCase()} (EPC: ${trackerRecord.epc})`;
          io.emit('location-tracker:new-activity', {
            id: trackerRecord.id,
            po_number: trackerRecord.po_number,
            item_number: trackerRecord.item_number,
            quantity: trackerRecord.quantity,
            status: trackerRecord.status,
            epc: trackerRecord.epc,
            user_id: trackerRecord.user_id,
            created_at: trackerRecord.created_at,
            timestamp: getBangladeshTimeISO(),
            activity_text
          });
          console.log(`📡 Live tracker update emitted for EPC: ${trackerRecord.epc}`);
        }
      } catch (socketError) {
        console.error('Socket emit error (non-critical):', socketError);
      }
    } else {
      console.log(`📡 No socket event emitted - 30s rule applied or no new record created`);
    }

    return trackerRecord;
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;
    console.error('❌ [LocationTracker] Failed to create record:', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create location tracker record'
    );
  } finally {
    client.release();
  }
};

const getAllLocationTrackers = async (
  filters: ILocationTrackerFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<ILocationTracker[]>> => {
  const { searchTerm, ...filterFields } = filters;

  const {
    page,
    limit,
    skip,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = paginationHelpers.calculatePagination(paginationOptions);

  console.log('🔍 [LocationTracker] Request parameters:', {
    filters,
    paginationOptions,
    calculated: { page, limit, skip, sortBy, sortOrder }
  });

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Search term - searches across multiple fields
  if (searchTerm) {
    conditions.push(
      `(lt.po_number ILIKE $${paramIndex} OR lt.item_number ILIKE $${paramIndex} OR lt.epc ILIKE $${paramIndex} OR i.item_description ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex})`
    );
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Specific field filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null && value !== '') {
      if (field === 'start_date' || field === 'fromDate') {
        conditions.push(`lt.created_at >= $${paramIndex}`);
        values.push(value);
        paramIndex++;
      } else if (field === 'end_date' || field === 'toDate') {
        conditions.push(`lt.created_at <= $${paramIndex}`);
        values.push(value);
        paramIndex++;
      } else {
        conditions.push(`lt.${field} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const allowedSortFields = [
    'id',
    'po_number',
    'item_number',
    'quantity',
    'status',
    'epc',
    'user_id',
    'created_at',
    'updated_at',
  ];

  // Ensure sortBy is valid and not a pagination parameter
  const safeSortBy = allowedSortFields.includes(sortBy) && !['page', 'limit', 'skip'].includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  console.log('🔍 [LocationTracker] Sort parameters:', { sortBy, safeSortBy, sortOrder, safeSortOrder });

  const query = `
    SELECT 
      lt.po_number,
      lt.item_number,
      lt.status,
      SUM(lt.quantity) AS quantity,
      lt.user_id,
      MAX(lt.created_at) AS created_at,
      MAX(lt.updated_at) AS updated_at,
      i.item_description,
      u.name AS location_name
    FROM location_tracker lt
    LEFT JOIN items i ON lt.item_number = i.item_number
    LEFT JOIN users u ON lt.user_id = u.id
    ${whereClause}
    GROUP BY 
      lt.po_number, 
      lt.item_number, 
      lt.status, 
      lt.user_id, 
      DATE_TRUNC('second', lt.created_at), 
      i.item_description, 
      u.name
    ORDER BY ${['po_number','item_number','status','user_id','quantity','created_at','updated_at'].includes(safeSortBy) ? (
      safeSortBy === 'quantity' ? 'quantity' : (
      safeSortBy === 'created_at' ? 'MAX(lt.created_at)' : (
      safeSortBy === 'updated_at' ? 'MAX(lt.updated_at)' : `lt.${safeSortBy}`))
    ) : 'MAX(lt.created_at)'} ${safeSortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);

  console.log('🔍 [LocationTracker] Final query:', query);
  console.log('🔍 [LocationTracker] Query values:', values);

  const result = await pool.query(query, values);
  console.log(`✅ [LocationTracker] Query executed successfully, returned ${result.rows.length} rows`);

  // Get total count (count grouped rows with same-second aggregation)
  const countQuery = `
    SELECT COUNT(*) FROM (
      SELECT 1
      FROM location_tracker lt
      LEFT JOIN items i ON lt.item_number = i.item_number
      LEFT JOIN users u ON lt.user_id = u.id
      ${whereClause}
      GROUP BY 
        lt.po_number, 
        lt.item_number, 
        lt.status, 
        lt.user_id, 
        DATE_TRUNC('second', lt.created_at), 
        i.item_description, 
        u.name
    ) grouped_rows
  `;
  const countResult = await pool.query(
    countQuery,
    values.slice(0, paramIndex - 1)
  );
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    data: result.rows,
  };
};

const getLocationTrackerStats = async (): Promise<ILocationTrackerStats> => {
  try {
    const totalQuery = 'SELECT COUNT(*) as total FROM location_tracker';
    const totalResult = await pool.query(totalQuery);

    const inQuery = `
      SELECT COUNT(*) as current_in 
      FROM location_tracker lt1
      WHERE lt1.status = 'in' 
      AND NOT EXISTS (
        SELECT 1 FROM location_tracker lt2 
        WHERE lt2.po_number = lt1.po_number 
        AND lt2.item_number = lt1.item_number 
        AND lt2.created_at > lt1.created_at
      )
    `;
    const inResult = await pool.query(inQuery);

    const outQuery = `
      SELECT COUNT(*) as current_out 
      FROM location_tracker lt1
      WHERE lt1.status = 'out' 
      AND NOT EXISTS (
        SELECT 1 FROM location_tracker lt2 
        WHERE lt2.po_number = lt1.po_number 
        AND lt2.item_number = lt1.item_number 
        AND lt2.created_at > lt1.created_at
      )
    `;
    const outResult = await pool.query(outQuery);

    const recentQuery = `
      SELECT COUNT(*) as recent 
      FROM location_tracker 
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 hour'
    `;
    const recentResult = await pool.query(recentQuery);

    return {
      total_trackers: parseInt(totalResult.rows[0].total, 10),
      current_in: parseInt(inResult.rows[0].current_in, 10),
      current_out: parseInt(outResult.rows[0].current_out, 10),
      recent_activity: parseInt(recentResult.rows[0].recent, 10),
    };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get location tracker statistics');
  }
};

const getCurrentLocationStatus = async (): Promise<ILocationStatus[]> => {
  try {
    console.log('🔍 Fetching current location status...');

    const query = `
      SELECT DISTINCT ON (po_number, item_number)
        lt.po_number,
        lt.item_number,
        lt.status as last_status,
        lt.created_at as last_updated,
        lt.epc,
        lt.user_id
      FROM location_tracker lt
      ORDER BY po_number, item_number, created_at DESC
    `;

    const result = await pool.query(query);
    console.log(`✅ Found ${result.rows.length} location status records`);

    return result.rows;
  } catch (error: any) {
    console.error('❌ Error in getCurrentLocationStatus:', error.message);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get current location status');
  }
};

const getLocationTrackerByLocation = async (locationCode: string): Promise<ILocationTracker[]> => {
  try {
    const query = `
      SELECT 
        lt.*,
        i.item_description
      FROM location_tracker lt
      LEFT JOIN items i ON lt.item_number = i.item_number
      WHERE lt.epc = $1
      ORDER BY lt.created_at DESC
    `;

    const result = await pool.query(query, [locationCode]);
    return result.rows;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get location trackers by location');
  }
};

export const LocationTrackerService = {
  processLocationScan,
  createLocationTracker,
  getAllLocationTrackers,
  getLocationTrackerStats,
  getCurrentLocationStatus,
  getLocationTrackerByLocation,
};
