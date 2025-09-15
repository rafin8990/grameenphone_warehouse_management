import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IRfidTag, IUHFTagRequest, IUHFTagsBatchRequest, IUHFResponse, IUHFTag } from './rfid.interface';

const createRfidTag = async (data: IRfidTag): Promise<IRfidTag | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First check if RFID tag already exists
    const checkQuery = `SELECT id, epc, status FROM rfid_tags WHERE epc = $1;`;
    const existingTag = await client.query(checkQuery, [data.epc]);

    if (existingTag.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new ApiError(
        httpStatus.CONFLICT, 
        `RFID tag with EPC '${data.epc}' already exists with status '${existingTag.rows[0].status}'`
      );
    }

    const insertQuery = `
      INSERT INTO rfid_tags (epc, timestamp, location, reader_id, status, rssi, count, device_id, session_id, parent_tag)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const values = [
      data.epc,
      data.timestamp || new Date(),
      data.location || null,
      data.reader_id || null,
      data.status ?? 'Available',
      data.rssi || null,
      data.count || 1,
      data.device_id || null,
      data.session_id || null,
      data.parent_tag || null,
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
    conditions.push(`(rt.epc ILIKE $${paramIndex})`);
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

    if (data.epc !== undefined) {
      updateFields.push(`epc = $${paramIndex++}`);
      values.push(data.epc);
    }

    if (data.timestamp !== undefined) {
      updateFields.push(`timestamp = $${paramIndex++}`);
      values.push(data.timestamp);
    }

    if (data.location !== undefined) {
      updateFields.push(`location = $${paramIndex++}`);
      values.push(data.location);
    }

    if (data.reader_id !== undefined) {
      updateFields.push(`reader_id = $${paramIndex++}`);
      values.push(data.reader_id);
    }

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (data.rssi !== undefined) {
      updateFields.push(`rssi = $${paramIndex++}`);
      values.push(data.rssi);
    }

    if (data.count !== undefined) {
      updateFields.push(`count = $${paramIndex++}`);
      values.push(data.count);
    }

    if (data.device_id !== undefined) {
      updateFields.push(`device_id = $${paramIndex++}`);
      values.push(data.device_id);
    }

    if (data.session_id !== undefined) {
      updateFields.push(`session_id = $${paramIndex++}`);
      values.push(data.session_id);
    }

    if (data.parent_tag !== undefined) {
      updateFields.push(`parent_tag = $${paramIndex++}`);
      values.push(data.parent_tag);
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
          'SELECT * FROM rfid_tags WHERE epc = $1',
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
    const checkQuery = `SELECT * FROM rfid_tags WHERE id = $1 AND status = 'Available';`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'RFID tag not found or not available for assignment');
    }

    // Update RFID tag status to assigned
    const updateQuery = `
      UPDATE rfid_tags 
      SET status = 'Assigned', updated_at = NOW()
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
    const checkQuery = `SELECT * FROM rfid_tags WHERE id = $1 AND status = 'Assigned';`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'RFID tag not found or not assigned');
    }

    // Update RFID tag status to available
    const updateQuery = `
      UPDATE rfid_tags 
      SET status = 'Available', updated_at = NOW()
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

// Bulk create RFID tags with duplicate checking
const createBulkRfidTags = async (dataArray: IRfidTag[]): Promise<{
  created: IRfidTag[];
  duplicates: string[];
  errors: any[];
}> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const created: IRfidTag[] = [];
    const duplicates: string[] = [];
    const errors: any[] = [];

    for (let i = 0; i < dataArray.length; i++) {
      const data = dataArray[i];
      try {
        // Check if RFID tag already exists
        const checkQuery = `SELECT id, epc, status FROM rfid_tags WHERE epc = $1;`;
        const existingTag = await client.query(checkQuery, [data.epc]);

        if (existingTag.rows.length > 0) {
          duplicates.push(data.epc);
          continue;
        }

        const insertQuery = `
          INSERT INTO rfid_tags (epc, timestamp, location, reader_id, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *;
        `;

        const values = [
          data.epc,
          data.timestamp || new Date(),
          data.location || null,
          data.reader_id || null,
          data.status ?? 'Available',
        ];

        const result = await client.query(insertQuery, values);
        created.push(result.rows[0]);
      } catch (error) {
        errors.push({
          index: i,
          epc: data.epc,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    await client.query('COMMIT');
    return { created, duplicates, errors };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Check for duplicate EPCs before creating
const checkDuplicateEpc = async (epc: string): Promise<boolean> => {
  const query = `SELECT id FROM rfid_tags WHERE epc = $1;`;
  const result = await pool.query(query, [epc]);
  return result.rows.length > 0;
};

// UHF-specific service methods to match Java code
const sendUHFTag = async (tagRequest: IUHFTagRequest): Promise<IUHFResponse> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID tag already exists
    const checkQuery = `SELECT id, epc, status FROM rfid_tags WHERE epc = $1;`;
    const existingTag = await client.query(checkQuery, [tagRequest.epc]);

    if (existingTag.rows.length > 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `RFID tag with EPC '${tagRequest.epc}' already exists with status '${existingTag.rows[0].status}'`,
        code: 409
      };
    }

    const insertQuery = `
      INSERT INTO rfid_tags (epc, rssi, count, timestamp, device_id, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      tagRequest.epc,
      tagRequest.rssi,
      tagRequest.count,
      new Date(tagRequest.timestamp),
      tagRequest.deviceId,
      'Available'
    ];

    const result = await client.query(insertQuery, values);
    await client.query('COMMIT');

    return {
      success: true,
      message: `UHF tag with EPC '${tagRequest.epc}' created successfully`,
      data: JSON.stringify(result.rows[0]),
      code: 201
    };
  } catch (error) {
    await client.query('ROLLBACK');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 500
    };
  } finally {
    client.release();
  }
};

const sendUHFTagsBatch = async (batchRequest: IUHFTagsBatchRequest): Promise<IUHFResponse> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const created: IUHFTag[] = [];
    const duplicates: string[] = [];
    const errors: any[] = [];

    for (let i = 0; i < batchRequest.tags.length; i++) {
      const tag = batchRequest.tags[i];
      try {
        // Check if RFID tag already exists
        const checkQuery = `SELECT id, epc, status FROM rfid_tags WHERE epc = $1;`;
        const existingTag = await client.query(checkQuery, [tag.epc]);

        if (existingTag.rows.length > 0) {
          duplicates.push(tag.epc);
          continue;
        }

        const insertQuery = `
          INSERT INTO rfid_tags (epc, rssi, count, timestamp, device_id, session_id, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *;
        `;

        const values = [
          tag.epc,
          tag.rssi,
          tag.count,
          new Date(tag.timestamp),
          tag.deviceId,
          batchRequest.sessionId,
          'Available'
        ];

        const result = await client.query(insertQuery, values);
        created.push(result.rows[0]);
      } catch (error) {
        errors.push({
          index: i,
          epc: tag.epc,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    await client.query('COMMIT');

    const message = `Batch processed: ${created.length} created, ${duplicates.length} duplicates, ${errors.length} errors`;
    
    return {
      success: true,
      message,
      data: JSON.stringify({
        created,
        duplicates,
        errors,
        summary: {
          total: batchRequest.tags.length,
          created: created.length,
          duplicates: duplicates.length,
          errors: errors.length
        }
      }),
      code: 201
    };
  } catch (error) {
    await client.query('ROLLBACK');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 500
    };
  } finally {
    client.release();
  }
};

const getUHFTags = async (page: number = 1, limit: number = 10): Promise<IUHFResponse> => {
  try {
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT * FROM rfid_tags 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2;
    `;
    
    const result = await pool.query(query, [limit, offset]);
    
    const countQuery = `SELECT COUNT(*) FROM rfid_tags;`;
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count, 10);

    return {
      success: true,
      message: `Retrieved ${result.rows.length} UHF tags`,
      data: JSON.stringify({
        tags: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }),
      code: 200
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 500
    };
  }
};

const deleteUHFTag = async (epc: string): Promise<IUHFResponse> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if RFID tag exists
    const checkQuery = `SELECT id FROM rfid_tags WHERE epc = $1;`;
    const checkResult = await client.query(checkQuery, [epc]);

    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `RFID tag with EPC '${epc}' not found`,
        code: 404
      };
    }

    const deleteQuery = `DELETE FROM rfid_tags WHERE epc = $1;`;
    await client.query(deleteQuery, [epc]);

    await client.query('COMMIT');

    return {
      success: true,
      message: `UHF tag with EPC '${epc}' deleted successfully`,
      code: 200
    };
  } catch (error) {
    await client.query('ROLLBACK');
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 500
    };
  } finally {
    client.release();
  }
};

export const RfidService = {
  createRfidTag,
  createBulkRfidTags,
  checkDuplicateEpc,
  getAllRfidTags,
  getSingleRfidTag,
  updateRfidTag,
  deleteRfidTag,
  checkRfidTags,
  assignRfidTag,
  unassignRfidTag,
  // UHF-specific methods
  sendUHFTag,
  sendUHFTagsBatch,
  getUHFTags,
  deleteUHFTag,
};
