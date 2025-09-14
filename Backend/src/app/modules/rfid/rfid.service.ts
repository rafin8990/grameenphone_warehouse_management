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
      INSERT INTO rfid_tags (tag_uid, status, parent_tag_id, current_location_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (tag_uid) DO NOTHING
      RETURNING *;
    `;

    const values = [
      data.tag_uid,
      data.status ?? 'available',
      data.parent_tag_id || null,
      data.current_location_id || null,
    ];

    const result = await client.query(insertQuery, values);
    await client.query('COMMIT');
    return result.rows[0] || null;
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

  // Add pagination parameters
  const limitParam = paramIndex;
  const offsetParam = paramIndex + 1;
  values.push(limit, skip);

  const query = `
    SELECT rt.*
    FROM rfid_tags rt
    ${whereClause}
    ORDER BY rt.${sortBy} ${sortOrder}
    LIMIT $${limitParam} OFFSET $${offsetParam};
  `;

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM rfid_tags rt ${whereClause};`;
  const countValues = conditions.length > 0 ? values.slice(0, paramIndex) : [];
  const countResult = await pool.query(countQuery, countValues);
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

    if (data.parent_tag_id !== undefined) {
      updateFields.push(`parent_tag_id = $${paramIndex++}`);
      values.push(data.parent_tag_id);
    }

    if (data.current_location_id !== undefined) {
      updateFields.push(`current_location_id = $${paramIndex++}`);
      values.push(data.current_location_id);
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

const checkRfidTags = async (data: any): Promise<{
  found: IRfidTag[];
  notFound: string[];
  errors: any[];
}> => {
  try {
    let requestData = data;
    
    if (typeof data === 'string') {
      try {
        requestData = JSON.parse(data);
      } catch (parseError) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid JSON format');
      }
    }

    let tagsToCheck = Array.isArray(requestData) ? requestData : [requestData];
    
    console.log('Tags to check:', tagsToCheck);
    
    const found: IRfidTag[] = [];
    const notFound: string[] = [];
    const errors: any[] = [];

    for (let i = 0; i < tagsToCheck.length; i++) {
      const { form_data, tag_uid } = tagsToCheck[i];
      let tagUidToCheck;
      try {
        if (typeof form_data === 'string') {
          const parsedArray = JSON.parse(form_data);
          if (Array.isArray(parsedArray) && parsedArray.length >= 2) {
            tagUidToCheck = parsedArray[1];
          } else {
            tagUidToCheck = form_data;
          }
        } else if (tag_uid) {
          tagUidToCheck = tag_uid;
        } else {
          tagUidToCheck = form_data;
        }
      } catch (parseError) {
        tagUidToCheck = form_data || tag_uid; 
      }

      console.log(`Checking tag ${i}:`, { form_data, tag_uid, tagUidToCheck });

      if (!tagUidToCheck) {
        console.log(`Tag ${i}: Missing tag_uid`);
        errors.push({ 
          index: i, 
          error: 'form_data or tag_uid is required and must contain valid tag_uid' 
        });
        continue;
      }

      try {
        const existingTag = await pool.query(
          'SELECT * FROM rfid_tags WHERE tag_uid = $1',
          [tagUidToCheck]
        );

        if (existingTag.rows.length > 0) {
          found.push(existingTag.rows[0]);
        } else {
          notFound.push(tagUidToCheck);
        }
      } catch (dbError) {
        errors.push({ 
          index: i, 
          error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}` 
        });
      }
    }
    
    return { found, notFound, errors };
  } catch (error) {
    console.error('=== RFID CHECK Error ===');
    console.error('Error details:', error);
    throw error;
  }
};

// Assign RFID Tag to Item
const assignRfidTag = async (id: number): Promise<IRfidTag | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID tag exists and is available
    const checkQuery = `SELECT * FROM rfid_tags WHERE id = $1 AND status = 'available';`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'RFID tag not found or not available for assignment');
    }

    // Update RFID tag status to assigned
    const updateQuery = `
      UPDATE rfid_tags 
      SET status = 'assigned', updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [id]);
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Unassign RFID Tag
const unassignRfidTag = async (id: number): Promise<IRfidTag | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID tag exists and is assigned
    const checkQuery = `SELECT * FROM rfid_tags WHERE id = $1 AND status = 'assigned';`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'RFID tag not found or not assigned');
    }

    // Update RFID tag status to available
    const updateQuery = `
      UPDATE rfid_tags 
      SET status = 'available', updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const result = await client.query(updateQuery, [id]);
    await client.query('COMMIT');
    
    return result.rows[0];
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
  checkRfidTags,
  assignRfidTag,
  unassignRfidTag,
};
