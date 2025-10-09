import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { ILocation, ILocationFilters, ICreateLocation, IUpdateLocation } from './locations.interface';

const createLocation = async (data: ICreateLocation): Promise<ILocation> => {
  const query = `
    INSERT INTO locations (location_name, location_code, sub_inventory_code)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const values = [data.location_name, data.location_code, data.sub_inventory_code || null];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error: any) {
    if (error.code === '23505') {
      throw new ApiError(
        httpStatus.CONFLICT,
        'Location code already exists. Please use a different code.'
      );
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create location');
  }
};

const getAllLocations = async (
  filters: ILocationFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<ILocation[]>> => {
  const { searchTerm, ...filterFields } = filters;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Search term - searches across multiple fields
  if (searchTerm) {
    conditions.push(
      `(location_name ILIKE $${paramIndex} OR location_code ILIKE $${paramIndex} OR sub_inventory_code ILIKE $${paramIndex})`
    );
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Specific field filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${field} ILIKE $${paramIndex}`);
      values.push(`%${value}%`);
      paramIndex++;
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      id,
      location_name,
      location_code,
      sub_inventory_code,
      created_at,
      updated_at
    FROM locations
    ${whereClause}
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query, values);

  return {
    data: result.rows,
  };
};


const getSingleLocation = async (id: number): Promise<ILocation | null> => {
  const query = `
    SELECT 
      id,
      location_name,
      location_code,
      sub_inventory_code,
      created_at,
      updated_at
    FROM locations
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
  }

  return result.rows[0];
};

const updateLocation = async (
  id: number,
  data: IUpdateLocation
): Promise<ILocation | null> => {
  try {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');

    const values = fields.map((field) => (data as any)[field]);
    values.push(id);

    const query = `
      UPDATE locations
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
    }

    return result.rows[0];
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    
    if (error.code === '23505') {
      throw new ApiError(
        httpStatus.CONFLICT,
        'Location code already exists. Please use a different code.'
      );
    }
    
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update location');
  }
};

const deleteLocation = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM locations WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete location');
  }
};

const getLocationStats = async () => {
  try {
    const totalQuery = 'SELECT COUNT(*) as total FROM locations';
    const totalResult = await pool.query(totalQuery);
    
    const recentQuery = `
      SELECT COUNT(*) as recent 
      FROM locations 
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `;
    const recentResult = await pool.query(recentQuery);

    return {
      total: parseInt(totalResult.rows[0].total, 10),
      recent: parseInt(recentResult.rows[0].recent, 10),
    };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get location statistics');
  }
};

export const LocationService = {
  createLocation,
  getAllLocations,
  getSingleLocation,
  updateLocation,
  deleteLocation,
  getLocationStats,
};
