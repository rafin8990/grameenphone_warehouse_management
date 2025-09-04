import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IRfidTag } from './rfid.interface';

const createRfidTag = async (data: IRfidTag): Promise<IRfidTag | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO rfid_tags 
        (tag_uid, status)
      VALUES ($1, $2)
      RETURNING *;
    `;

    const values = [
      data.tag_uid,
      data.status ?? 'available', // Default status is available
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

const getAllRfidTags = async (
  filters: Partial<IRfidTag> & { searchTerm?: string },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IRfidTag[]>> => {
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

  if (searchTerm) {
    conditions.push(`(rt.tag_uid ILIKE $${paramIndex})`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`rt.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT rt.*
    FROM rfid_tags rt
    ${whereClause}
    ORDER BY rt.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM rfid_tags rt ${whereClause};`;
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

const getSingleRfidTag = async (id: number): Promise<IRfidTag | null> => {
  const query = `
    SELECT * FROM rfid_tags 
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'RFID tag not found');
  }

  return result.rows[0];
};

const updateRfidTag = async (id: number, data: Partial<IRfidTag>): Promise<IRfidTag | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID tag exists
    const checkQuery = `SELECT id FROM rfid_tags WHERE id = $1;`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'RFID tag not found');
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.tag_uid !== undefined) {
      updateFields.push(`tag_uid = $${paramIndex++}`);
      values.push(data.tag_uid);
    }

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No fields to update');
    }

    const updateQuery = `
      UPDATE rfid_tags 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    values.push(id);

    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteRfidTag = async (id: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID tag exists
    const checkQuery = `SELECT id FROM rfid_tags WHERE id = $1;`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'RFID tag not found');
    }

    const deleteQuery = `DELETE FROM rfid_tags WHERE id = $1;`;
    await client.query(deleteQuery, [id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const RfidService = {
  createRfidTag,
  getAllRfidTags,
  getSingleRfidTag,
  updateRfidTag,
  deleteRfidTag,
};
