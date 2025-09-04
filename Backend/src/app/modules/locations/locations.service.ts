import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { ILocation } from './locations.interface';

const createLocation = async (data: ILocation): Promise<ILocation | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO locations 
        (sub_inventory_code, locator_code, name, description, org_code, status, capacity, attributes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const values = [
      data.sub_inventory_code,
      data.locator_code,
      data.name ?? null,
      data.description ?? null,
      data.org_code ?? null,
      data.status ?? 'active',
      data.capacity ?? null,
      data.attributes ? JSON.stringify(data.attributes) : '{}',
    ];

    const result = await client.query(insertQuery, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getAllLocations = async (
  filters: Partial<ILocation> & { 
    searchTerm?: string;
    capacity_min?: number;
    capacity_max?: number;
  },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<ILocation[]>> => {
  const { searchTerm, capacity_min, capacity_max, ...filterFields } = filters;
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

  if (searchTerm) {
    conditions.push(`(l.name ILIKE $${paramIndex} OR l.sub_inventory_code ILIKE $${paramIndex} OR l.locator_code ILIKE $${paramIndex})`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Handle capacity range filtering
  if (capacity_min !== undefined) {
    conditions.push(`l.capacity >= $${paramIndex}`);
    values.push(capacity_min);
    paramIndex++;
  }

  if (capacity_max !== undefined) {
    conditions.push(`l.capacity <= $${paramIndex}`);
    values.push(capacity_max);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`l.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      l.*,
      COALESCE(l.attributes, '{}'::jsonb) as attributes
    FROM locations l
    ${whereClause}
    ORDER BY l.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM locations l ${whereClause};`;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
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

const getSingleLocation = async (id: number): Promise<ILocation | null> => {
  const query = `
    SELECT 
      l.*,
      COALESCE(l.attributes, '{}'::jsonb) as attributes
    FROM locations l
    WHERE l.id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
  }

  return result.rows[0];
};

const updateLocation = async (
  id: number,
  data: Partial<ILocation>
): Promise<ILocation | null> => {
  try {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => {
        if (field === 'attributes') {
          return `attributes = $${index + 1}::jsonb`;
        }
        return `${field} = $${index + 1}`;
      })
      .join(', ');
    
    const values = fields.map(field => {
      if (field === 'attributes') {
        return JSON.stringify((data as any)[field] || {});
      }
      return (data as any)[field];
    });
    values.push(id);

    const query = `
      UPDATE locations
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
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

export const LocationService = {
  createLocation,
  getAllLocations,
  getSingleLocation,
  updateLocation,
  deleteLocation,
};
