import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IInbound, IInboundFilters, IInboundItem, IRfidScanData } from './inbound.interface';
import { io } from '../../../server';

// Process RFID scan and create/update inbound record
const processRfidScan = async (scanData: IRfidScanData): Promise<IInbound | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Find hex code in po_hex_codes table using EPC
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

    // Step 2: Get item description from items table
    const itemQuery = `
      SELECT item_description
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

    const item_description = itemResult.rows[0].item_description || '';

    // Step 3: Check if inbound record exists for this PO
    const inboundQuery = `
      SELECT id, items
      FROM inbound
      WHERE po_number = $1;
    `;
    const inboundResult = await client.query(inboundQuery, [po_number]);

    let inboundRecord: IInbound;

    if (inboundResult.rows.length === 0) {
      // No inbound record exists - create new one
      const newItem: IInboundItem = {
        item_number,
        item_description,
        lot_no,
        quantity: Number(quantity),
      };

      const insertQuery = `
        INSERT INTO inbound (po_number, items, received_at)
        VALUES ($1, $2, CURRENT_DATE)
        RETURNING *;
      `;

      const insertResult = await client.query(insertQuery, [
        po_number,
        JSON.stringify([newItem]),
      ]);

      inboundRecord = insertResult.rows[0];
      inboundRecord.items = JSON.parse(inboundRecord.items as any);
    } else {
      // Inbound record exists - update items JSON
      const existingInbound = inboundResult.rows[0];
      let items: IInboundItem[] = existingInbound.items;

      // Check if this exact EPC was already processed
      // We need to track processed EPCs separately
      const epcCheckQuery = `
        SELECT epc FROM processed_epcs WHERE po_number = $1 AND epc = $2;
      `;
      
      // First, create processed_epcs table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS processed_epcs (
          id SERIAL PRIMARY KEY,
          po_number VARCHAR(100) NOT NULL,
          epc VARCHAR(255) NOT NULL,
          processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(po_number, epc)
        );
      `);

      const epcCheckResult = await client.query(epcCheckQuery, [po_number, scanData.epc]);

      if (epcCheckResult.rows.length > 0) {
        // EPC already processed - skip
        await client.query('COMMIT');
        return existingInbound;
      }

      // Mark this EPC as processed
      await client.query(
        'INSERT INTO processed_epcs (po_number, epc) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [po_number, scanData.epc]
      );

      // Find if item already exists in the items array
      const existingItemIndex = items.findIndex(
        (item) => item.item_number === item_number
      );

      if (existingItemIndex !== -1) {
        // Item exists - increase quantity
        items[existingItemIndex].quantity += Number(quantity);
      } else {
        // Item doesn't exist - add new item
        items.push({
          item_number,
          item_description,
          lot_no,
          quantity: Number(quantity),
        });
      }

      // Update inbound record
      const updateQuery = `
        UPDATE inbound
        SET items = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
      `;

      const updateResult = await client.query(updateQuery, [
        JSON.stringify(items),
        existingInbound.id,
      ]);

      inboundRecord = updateResult.rows[0];
      inboundRecord.items = JSON.parse(inboundRecord.items as any);
    }

    await client.query('COMMIT');

    // Emit socket event for live dashboard
    if (io) {
      io.emit('inbound:new-scan', {
        po_number,
        item_number,
        item_description,
        quantity: Number(quantity),
        lot_no,
        timestamp: new Date().toISOString(),
        epc: scanData.epc,
      });
    }

    return inboundRecord;
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to process RFID scan'
    );
  } finally {
    client.release();
  }
};

const getAllInbounds = async (
  filters: IInboundFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IInbound[]>> => {
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

  // Search term
  if (searchTerm) {
    conditions.push(`(po_number ILIKE $${paramIndex})`);
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

  const allowedSortFields = [
    'id',
    'po_number',
    'received_at',
    'created_at',
    'updated_at',
  ];

  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const query = `
    SELECT 
      id,
      po_number,
      items,
      received_at,
      created_at,
      updated_at
    FROM inbound
    ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  // Parse JSON items
  const inbounds = result.rows.map((row) => ({
    ...row,
    items: row.items,
  }));

  const countQuery = `SELECT COUNT(*) FROM inbound ${whereClause};`;
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
    data: inbounds,
  };
};

const getSingleInbound = async (id: number): Promise<IInbound | null> => {
  const query = `
    SELECT 
      id,
      po_number,
      items,
      received_at,
      created_at,
      updated_at
    FROM inbound
    WHERE id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Inbound record not found');
  }

  return {
    ...result.rows[0],
    items: result.rows[0].items,
  };
};

const updateInbound = async (
  id: number,
  data: Partial<IInbound>
): Promise<IInbound | null> => {
  try {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => {
        if (field === 'items') {
          return `${field} = $${index + 1}::jsonb`;
        }
        return `${field} = $${index + 1}`;
      })
      .join(', ');

    const values = fields.map((field) => {
      if (field === 'items') {
        return JSON.stringify((data as any)[field]);
      }
      return (data as any)[field];
    });
    values.push(id);

    const query = `
      UPDATE inbound
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Inbound record not found');
    }

    return {
      ...result.rows[0],
      items: result.rows[0].items,
    };
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update inbound');
  }
};

const deleteInbound = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM inbound WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Inbound record not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete inbound');
  }
};

export const InboundService = {
  processRfidScan,
  getAllInbounds,
  getSingleInbound,
  updateInbound,
  deleteInbound,
};

