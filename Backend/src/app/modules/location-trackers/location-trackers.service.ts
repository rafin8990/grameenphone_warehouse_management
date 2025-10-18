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

    const user_id = Number(scanData.value);
    if (!user_id) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'User ID (value) is required in the payload'
      );
    }

    const hexCodeQuery = `
      SELECT po_number, lot_no, item_number, quantity
      FROM po_hex_codes
      WHERE hex_code = $1;
    `;
    const hexCodeResult = await client.query(hexCodeQuery, [scanData.epc]);

    if (hexCodeResult.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `EPC/Hex code "${scanData.epc}" not found in po_hex_codes table`
      );
    }

    const hexCodeData = hexCodeResult.rows[0];
    const { po_number, lot_no, item_number, quantity } = hexCodeData;

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [po_number]);

    const poQuery = `
      SELECT 
        po.po_number, 
        po.po_description as description, 
        po.supplier_name, 
        po.po_type as status,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_number', poi.item_number,
              'quantity', poi.quantity,
              'created_at', poi.created_at
            )
          ) FILTER (WHERE poi.id IS NOT NULL),
          '[]'::json
        ) as po_items_array
      FROM purchase_orders po
      LEFT JOIN po_items poi ON po.id = poi.po_id
      WHERE po.po_number = $1
      GROUP BY po.id, po.po_number, po.po_description, po.supplier_name, po.po_type;
    `;
    const poResult = await client.query(poQuery, [po_number]);

    if (poResult.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Purchase order "${po_number}" not found`
      );
    }

    const poData = poResult.rows[0];

    const itemQuery = `
      SELECT item_description, primary_uom
      FROM items
      WHERE item_number = $1;
    `;
    const itemResult = await client.query(itemQuery, [item_number]);

    if (itemResult.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Item "${item_number}" not found in items table`
      );
    }

    const itemData = itemResult.rows[0];

    const userQuery = `
      SELECT name
      FROM users
      WHERE id = $1;
    `;
    const userResult = await client.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `User with ID "${user_id}" not found`
      );
    }

    const userData = userResult.rows[0];
    const location_name = userData.name; 


    // Step 3️⃣: Check for cooldown and determine status
    let shouldCreateLocationTracker = true;
    let newStatus: 'in' | 'out' = 'in';

    // Check if same EPC+user_id+item_number exists
    const locationTrackerQuery = `
      SELECT id, status, created_at
      FROM location_tracker
      WHERE epc = $1 AND user_id = $2 AND item_number = $3
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const trackerResult = await client.query(locationTrackerQuery, [
      scanData.epc, user_id, item_number
    ]);

    if (trackerResult.rows.length > 0) {
      const lastRecord = trackerResult.rows[0];
      const timeDiff = Date.now() - new Date(lastRecord.created_at).getTime();
      
      if (timeDiff < 60000) { // 60 seconds cooldown
        shouldCreateLocationTracker = false;
      } else {
        // Toggle status after 60 seconds
        newStatus = lastRecord.status === 'in' ? 'out' : 'in';
      }
    } else {
      // Check if same EPC + same item_number exists with different location
      const differentLocationQuery = `
        SELECT id, status, created_at, user_id
        FROM location_tracker
        WHERE epc = $1 AND item_number = $2 AND user_id != $3
        ORDER BY created_at DESC
        LIMIT 1;
      `;
      const differentLocationResult = await client.query(differentLocationQuery, [
        scanData.epc, item_number, user_id
      ]);

      if (differentLocationResult.rows.length > 0) {
        // Different location - create new record with 'in' status
        newStatus = 'in';
      } else {
        // First time scan for this EPC+item combination
        newStatus = 'in';
      }
    }

    // Insert location tracker record
    let trackerInsertResult = null;
    if (shouldCreateLocationTracker) {
      const insertTrackerQuery = `
        INSERT INTO location_tracker (epc, user_id, po_number, item_number, quantity, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *;
      `;
      trackerInsertResult = await client.query(insertTrackerQuery, [
        scanData.epc, 
        user_id, 
        po_number, 
        item_number, 
        Number(quantity), 
        newStatus,
        getBangladeshTimeISO()
      ]);
    }

    await client.query('COMMIT');

    // Step 5️⃣: Emit socket event only for new records
    if (shouldCreateLocationTracker && trackerInsertResult?.rows[0]) {
      const trackerRecord = trackerInsertResult.rows[0];
      const io = getSocketInstance?.();
      if (io) {
        // Resolve location name from users table by user_id
        let userLocationName: string | undefined;
        if (trackerRecord.user_id) {
          try {
            const userRes = await pool.query('SELECT name FROM users WHERE id = $1 LIMIT 1', [trackerRecord.user_id]);
            userLocationName = userRes.rows[0]?.name;
          } catch (e) {
            // Could not resolve user name for location
          }
        }

        const activityText = `${trackerRecord.item_number} ${trackerRecord.status.toUpperCase()} (EPC: ${trackerRecord.epc})`;
        io.emit('location-tracker:new-activity', {
          id: trackerRecord.id,
          po_number: trackerRecord.po_number,
          item_number: trackerRecord.item_number,
          item_description: itemData.item_description,
          quantity: trackerRecord.quantity,
          status: trackerRecord.status,
          epc: trackerRecord.epc,
          user_id: trackerRecord.user_id,
          location_name: userLocationName,
          created_at: trackerRecord.created_at,
          timestamp: getBangladeshTimeISO(),
          activity_text: activityText,
        });
      }
    }

    return trackerInsertResult?.rows[0] || null;
  } catch (error: any) {
    await client.query('ROLLBACK');
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
          shouldCreateRecord = false;
          newStatus = lastRecord.status;
        } else {
          // More than 30 seconds - toggle the status (in -> out, out -> in)
          newStatus = lastRecord.status === 'in' ? 'out' : 'in';
          shouldCreateRecord = true; // We need to create a new record with the toggled status
        }
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
        }

        const insertQuery = `
          INSERT INTO location_tracker (po_number, item_number, quantity, status, epc, user_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
          RETURNING *;
        `;

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
      } catch (insertError: any) {
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
    }

    await client.query('COMMIT');

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
        }
      } catch (socketError) {
        // Socket emit error (non-critical)
      }
    }

    return trackerRecord;
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;
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

  const result = await pool.query(query, values);

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

    return result.rows;
  } catch (error: any) {
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
