import httpStatus from 'http-status';
import crypto from 'crypto';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IPoHexCode, IPoHexCodeFilters } from './po-hex-codes.interface';

// Generate unique 16-character hex code
const generateHexCode = async (): Promise<string> => {
  let hexCode: string;
  let isUnique = false;

  while (!isUnique) {
    // Generate 8 random bytes (16 hex characters)
    hexCode = crypto.randomBytes(8).toString('hex').toUpperCase();

    // Check if hex code already exists
    const checkQuery = 'SELECT hex_code FROM po_hex_codes WHERE hex_code = $1';
    const result = await pool.query(checkQuery, [hexCode]);

    if (result.rows.length === 0) {
      isUnique = true;
    }
  }

  return hexCode!;
};

const createPoHexCode = async (data: IPoHexCode): Promise<IPoHexCode | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generate unique hex code
    const hexCode = await generateHexCode();

    const insertQuery = `
      INSERT INTO po_hex_codes 
        (po_number, lot_no, item_number, quantity, uom, hex_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      data.po_number,
      data.lot_no,
      data.item_number,
      data.quantity,
      data.uom,
      hexCode,
    ];

    const result = await client.query(insertQuery, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;

    // Handle duplicate hex code error (very rare)
    if (error.code === '23505') {
      // Retry once
      return await createPoHexCode(data);
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create PO hex code'
    );
  } finally {
    client.release();
  }
};

const getAllPoHexCodes = async (
  filters: IPoHexCodeFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IPoHexCode[]>> => {
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
      `(po_number ILIKE $${paramIndex} OR lot_no ILIKE $${paramIndex} OR item_number ILIKE $${paramIndex} OR hex_code ILIKE $${paramIndex})`
    );
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Specific field filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sortBy to prevent SQL injection
  const allowedSortFields = [
    'id',
    'po_number',
    'lot_no',
    'item_number',
    'quantity',
    'uom',
    'hex_code',
    'created_at',
    'updated_at',
  ];

  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const query = `
    SELECT 
      id,
      po_number,
      lot_no,
      item_number,
      quantity,
      uom,
      hex_code,
      created_at,
      updated_at
    FROM po_hex_codes
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  // Get total count
  const countQuery = `SELECT COUNT(*) FROM po_hex_codes ${whereClause};`;
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

const getSinglePoHexCode = async (id: number): Promise<IPoHexCode | null> => {
  const query = `
    SELECT 
      id,
      po_number,
      lot_no,
      item_number,
      quantity,
      uom,
      hex_code,
      created_at,
      updated_at
    FROM po_hex_codes
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'PO hex code not found');
  }

  return result.rows[0];
};

const updatePoHexCode = async (
  id: number,
  data: Partial<IPoHexCode>
): Promise<IPoHexCode | null> => {
  try {
    // Remove hex_code from update data if present (cannot be updated)
    const { hex_code, ...updateData } = data;

    const fields = Object.keys(updateData);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');

    const values = fields.map(field => (updateData as any)[field]);
    values.push(id);

    const query = `
      UPDATE po_hex_codes
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'PO hex code not found');
    }

    return result.rows[0];
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update PO hex code');
  }
};

const deletePoHexCode = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM po_hex_codes WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'PO hex code not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete PO hex code');
  }
};

export const PoHexCodeService = {
  createPoHexCode,
  getAllPoHexCodes,
  getSinglePoHexCode,
  updatePoHexCode,
  deletePoHexCode,
};

