import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { ILocationTracker, ILocationTrackerFilters, ICreateLocationTracker, ILocationTrackerStats, ILocationStatus } from './location-trackers.interface';

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

const createLocationTracker = async (data: ICreateLocationTracker): Promise<ILocationTracker> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if location exists
    const locationCheck = await client.query(
      'SELECT location_code FROM locations WHERE location_code = $1',
      [data.location_code]
    );

    if (locationCheck.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Location with code "${data.location_code}" not found`
      );
    }

    // Check for recent activity (within 30 seconds)
    const recentCheck = await client.query(`
      SELECT status, created_at 
      FROM location_tracker 
      WHERE location_code = $1 AND po_number = $2 AND item_number = $3
      ORDER BY created_at DESC 
      LIMIT 1
    `, [data.location_code, data.po_number, data.item_number]);

    let newStatus: 'in' | 'out' = data.status;

    if (recentCheck.rows.length > 0) {
      const lastRecord = recentCheck.rows[0];
      const timeDiff = Date.now() - new Date(lastRecord.created_at).getTime();
      
      // If within 30 seconds, toggle the status
      if (timeDiff < 30000) {
        newStatus = lastRecord.status === 'in' ? 'out' : 'in';
        console.log(`🔄 Status toggled for ${data.location_code}: ${lastRecord.status} → ${newStatus}`);
      }
    }

    // Create new tracker record
    const insertQuery = `
      INSERT INTO location_tracker (location_code, po_number, item_number, quantity, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const result = await client.query(insertQuery, [
      data.location_code,
      data.po_number,
      data.item_number,
      data.quantity,
      newStatus
    ]);

    await client.query('COMMIT');

    const trackerRecord = result.rows[0];

    // Emit live update via socket
    try {
      const io = getSocketInstance();
      if (io) {
        io.emit('location-tracker:new-activity', {
          id: trackerRecord.id,
          location_code: trackerRecord.location_code,
          po_number: trackerRecord.po_number,
          item_number: trackerRecord.item_number,
          quantity: trackerRecord.quantity,
          status: trackerRecord.status,
          created_at: trackerRecord.created_at,
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Live tracker update emitted for location: ${trackerRecord.location_code}`);
      }
    } catch (socketError) {
      console.error('Socket emit error (non-critical):', socketError);
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
      `(lt.location_code ILIKE $${paramIndex} OR lt.po_number ILIKE $${paramIndex} OR lt.item_number ILIKE $${paramIndex})`
    );
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Specific field filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      if (field === 'start_date') {
        conditions.push(`lt.created_at >= $${paramIndex}`);
        values.push(value);
        paramIndex++;
      } else if (field === 'end_date') {
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

  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

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
    const query = `
      SELECT DISTINCT ON (location_code, po_number, item_number)
        location_code,
        po_number,
        item_number,
        status as last_status,
        created_at as last_updated
      FROM location_tracker
      ORDER BY location_code, po_number, item_number, created_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
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
      LEFT JOIN locations l ON lt.location_code = l.location_code
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
  createLocationTracker,
  getAllLocationTrackers,
  getLocationTrackerStats,
  getCurrentLocationStatus,
  getLocationTrackerByLocation,
};
