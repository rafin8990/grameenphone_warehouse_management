import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { ILocationTracker, ILocationTrackerFilters, ICreateLocationTracker, ILocationTrackerStats, ILocationStatus, ILocationScanData } from './location-trackers.interface';
import { locationTrackingRedis } from '../../../services/locationTrackingRedis';

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

    const locationQuery = `
      SELECT location_code, location_name
      FROM locations
      WHERE location_code = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const locationResult = await client.query(locationQuery, [scanData.deviceId]);

    if (locationResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, `No location found for device ID "${scanData.deviceId}"`);
    }

    const { location_code, location_name } = locationResult.rows[0];

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

    // Step 3️⃣: Check Redis for 30-second cooldown
    const cooldownCheck = await locationTrackingRedis.canProcessScan(
      scanData.epc
    );

    let shouldCreateRecord = false;
    let newStatus: 'in' | 'out' = 'in';
    let trackerRecord!: ILocationTracker;

    if (cooldownCheck.canProcess) {
      // Extra safety: enforce 30s cooldown from DB if Redis is unavailable or missed the key
      const recentRecordQuery = `
        SELECT id, status, created_at
        FROM location_tracker
        WHERE epc = $1
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      const recentRecordResult = await client.query(recentRecordQuery, [scanData.epc]);
      if (recentRecordResult.rows.length > 0) {
        const last = recentRecordResult.rows[0];
        const lastCreatedAt = new Date(last.created_at);
        const secondsSinceLast = Math.floor((Date.now() - lastCreatedAt.getTime()) / 1000);
        if (secondsSinceLast < 30) {
          // Within 30 seconds → skip creating new record
          shouldCreateRecord = false;
          trackerRecord = {
            id: last.id,
            location_code,
            po_number,
            item_number,
            quantity,
            status: last.status,
            epc: scanData.epc,
            created_at: last.created_at,
            updated_at: last.created_at,
          } as ILocationTracker;
          console.log(`🚫 DB: EPC ${scanData.epc} within 30s (${secondsSinceLast}s) → skipping insert`);
          // Short-circuit: skip toggle/insert path entirely
        }
      }

      if (!trackerRecord) {
      // Can process the scan - check database for last status if Redis doesn't have it
      let lastStatus = cooldownCheck.lastStatus;
      
      if (!lastStatus) {
        // Get last status from database
        const lastRecordQuery = `
          SELECT status, created_at
          FROM location_tracker
          WHERE epc = $1
          ORDER BY created_at DESC
          LIMIT 1;
        `;
        const lastRecordResult = await client.query(lastRecordQuery, [
          scanData.epc
        ]);

        if (lastRecordResult.rows.length > 0) {
          lastStatus = lastRecordResult.rows[0].status;
          console.log(`📊 Database: Found last status = ${lastStatus}`);
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
      console.log(`🚫 Within 30s cooldown → skipping (${cooldownCheck.timeRemaining}s remaining, last status: ${cooldownCheck.lastStatus})`);
      
      // Get the last record from database for response
      const lastRecordQuery = `
        SELECT id, status, created_at
        FROM location_tracker
        WHERE epc = $1
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      const lastRecordResult = await client.query(lastRecordQuery, [
        scanData.epc
      ]);

      if (lastRecordResult.rows.length > 0) {
        const last = lastRecordResult.rows[0];
        trackerRecord = {
          id: last.id,
          location_code,
          po_number,
          item_number,
          quantity,
          status: last.status,
          epc: scanData.epc,
          created_at: last.created_at,
          updated_at: last.created_at
        } as ILocationTracker;
      }
    }

    // Step 4️⃣: Insert new record if needed
    if (shouldCreateRecord) {
      const insertQuery = `
        INSERT INTO location_tracker (
          location_code, po_number, item_number, quantity, status, epc, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, now(), now())
        RETURNING *;
      `;
      const insertResult = await client.query(insertQuery, [
        location_code,
        po_number,
        item_number,
        quantity,
        newStatus,
        scanData.epc
      ]);
      trackerRecord = insertResult.rows[0];
      console.log(`✅ Inserted → ID=${trackerRecord.id}, status=${trackerRecord.status}`);
      
      // Record the scan in Redis for cooldown tracking
      await locationTrackingRedis.recordScan(
        scanData.epc,
        newStatus
      );
    }

    await client.query('COMMIT');

    // Step 5️⃣: Emit socket event only for new records
    if (shouldCreateRecord && trackerRecord?.id) {
      const io = getSocketInstance?.();
      if (io) {
        const activityText = `${trackerRecord.item_number} ${trackerRecord.status.toUpperCase()} at ${trackerRecord.location_code}`;
        io.emit('location-tracker:new-activity', {
          id: trackerRecord.id,
          location_code: trackerRecord.location_code,
          po_number: trackerRecord.po_number,
          item_number: trackerRecord.item_number,
          quantity: trackerRecord.quantity,
          status: trackerRecord.status,
          epc: trackerRecord.epc,
          created_at: trackerRecord.created_at,
          timestamp: new Date().toISOString(),
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
    // Check if location exists
    const locationCheck = await client.query(
      'SELECT locator_code FROM locations WHERE locator_code = $1',
      [data.location_code]
    );

    if (locationCheck.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Location with code "${data.location_code}" not found`
      );
    }

    let shouldCreateRecord = true;
    let newStatus: 'in' | 'out' = data.status;

    // Check if same EPC, location_code, po_number, and item_number combination already exists
    if (data.epc) {
      const existingEpcQuery = `
        SELECT status, created_at 
        FROM location_tracker 
        WHERE epc = $1 AND location_code = $2 AND po_number = $3 AND item_number = $4
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const existingEpcResult = await client.query(existingEpcQuery, [
        data.epc,
        data.location_code,
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
          console.log(`🔄 Same EPC combination >30s ago - toggling status: ${lastRecord.status} → ${newStatus} for ${data.location_code}`);
          console.log(`⏰ Time difference: ${timeDiff}ms (${Math.round(timeDiff / 1000)}s)`);
          shouldCreateRecord = true; // We need to create a new record with the toggled status
        }
      } else {
        // No existing EPC combination - create new entry with requested status
        console.log(`✨ New EPC combination - creating "${data.status}" entry for ${data.location_code}`);
      }
    } else {
      // Legacy logic for non-EPC tracking
      const recentCheck = await client.query(`
        SELECT status, created_at 
        FROM location_tracker 
        WHERE location_code = $1 AND po_number = $2 AND item_number = $3
        ORDER BY created_at DESC 
        LIMIT 1
      `, [data.location_code, data.po_number, data.item_number]);

      if (recentCheck.rows.length > 0) {
        const lastRecord = recentCheck.rows[0];
        const timeDiff = Date.now() - new Date(lastRecord.created_at).getTime();
        // If last post was 30s ago or more, toggle the status; otherwise keep requested
        if (timeDiff >= 30000) {
          newStatus = lastRecord.status === 'in' ? 'out' : 'in';
          console.log(`🔄 Status toggled (>=30s) for ${data.location_code}: ${lastRecord.status} → ${newStatus}`);
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
            WHERE epc = $1 AND location_code = $2 AND po_number = $3 AND item_number = $4
          `;
          await client.query(deleteQuery, [
            data.epc,
            data.location_code,
            data.po_number,
            data.item_number
          ]);
          console.log(`🗑️ Deleted existing records for EPC combination`);
        }

        const insertQuery = `
          INSERT INTO location_tracker (location_code, po_number, item_number, quantity, status, epc)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *;
        `;

        console.log('📝 [LocationTracker] Inserting row with computed status:', newStatus);
        const result = await client.query(insertQuery, [
          data.location_code,
          data.po_number,
          data.item_number,
          data.quantity,
          newStatus,
          data.epc || null
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
        location_code: data.location_code,
        po_number: data.po_number,
        item_number: data.item_number,
        quantity: data.quantity,
        status: newStatus,
        epc: data.epc,
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log(`ℹ️ No new location tracker created - item remains "${newStatus}" at ${data.location_code}`);
    }

    await client.query('COMMIT');

    console.log('✅ [LocationTracker] Insert successful:', {
      id: trackerRecord.id,
      location_code: trackerRecord.location_code,
      po_number: trackerRecord.po_number,
      item_number: trackerRecord.item_number,
      quantity: trackerRecord.quantity,
      status: trackerRecord.status,
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
          const activity_text = `${trackerRecord.item_number} ${String(trackerRecord.status).toUpperCase()} at ${trackerRecord.location_code}`;
          io.emit('location-tracker:new-activity', {
            id: trackerRecord.id,
            location_code: trackerRecord.location_code,
            po_number: trackerRecord.po_number,
            item_number: trackerRecord.item_number,
            quantity: trackerRecord.quantity,
            status: trackerRecord.status,
            epc: trackerRecord.epc,
            created_at: trackerRecord.created_at,
            timestamp: new Date().toISOString(),
            activity_text
          });
          console.log(`📡 Live tracker update emitted for location: ${trackerRecord.location_code}`);
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
      `(lt.location_code ILIKE $${paramIndex} OR lt.po_number ILIKE $${paramIndex} OR lt.item_number ILIKE $${paramIndex})`
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
    'location_code',
    'po_number',
    'item_number',
    'quantity',
    'status',
    'created_at',
    'updated_at',
  ];

  // Ensure sortBy is valid and not a pagination parameter
  const safeSortBy = allowedSortFields.includes(sortBy) && !['page', 'limit', 'skip'].includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  console.log('🔍 [LocationTracker] Sort parameters:', { sortBy, safeSortBy, sortOrder, safeSortOrder });

  const query = `
    SELECT 
      lt.id,
      lt.location_code,
      lt.po_number,
      lt.item_number,
      lt.quantity,
      lt.status,
      lt.created_at,
      lt.updated_at,
      l.location_name,
      i.item_description
    FROM location_tracker lt
    LEFT JOIN locations l ON lt.location_code = l.location_code
    LEFT JOIN items i ON lt.item_number = i.item_number
    ${whereClause}
    ORDER BY lt.${safeSortBy} ${safeSortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) 
    FROM location_tracker lt
    ${whereClause}
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
        WHERE lt2.location_code = lt1.location_code 
        AND lt2.po_number = lt1.po_number 
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
        WHERE lt2.location_code = lt1.location_code 
        AND lt2.po_number = lt1.po_number 
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
        lt.location_code,
        lt.po_number,
        lt.item_number,
        lt.status as last_status,
        lt.created_at as last_updated,
        COALESCE(l.name, lt.location_code) as location_name
      FROM location_tracker lt
      LEFT JOIN locations l ON lt.location_code = l.locator_code
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
        l.location_name,
        i.item_description
      FROM location_tracker lt
      LEFT JOIN locations l ON lt.location_code = l.locator_code
      LEFT JOIN items i ON lt.item_number = i.item_number
      WHERE lt.location_code = $1
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
