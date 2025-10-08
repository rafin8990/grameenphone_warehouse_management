import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IInbound, IInboundFilters, IInboundItem, IRfidScanData } from './inbound.interface';

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

// Process RFID scan and create/update inbound record
const processRfidScan = async (scanData: IRfidScanData): Promise<IInbound | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('📡 Processing RFID scan:', scanData);

    // Step 1: Find hex code in po_hex_codes table using EPC
    const hexCodeQuery = `
      SELECT po_number, lot_no, item_number, quantity
      FROM po_hex_codes
      WHERE hex_code = $1;
    `;
    console.log('🔍 Searching for EPC:', scanData.epc);
    const hexCodeResult = await client.query(hexCodeQuery, [scanData.epc]);

    if (hexCodeResult.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `EPC/Hex code "${scanData.epc}" not found in po_hex_codes table`
      );
    }

    const hexCodeData = hexCodeResult.rows[0];
    const { po_number, lot_no, item_number, quantity } = hexCodeData;
    console.log('✅ Hex code found:', { po_number, lot_no, item_number, quantity });

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
    console.log('✅ Item found:', { item_number, item_description });

    // Step 3: Create processed_epcs table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_epcs (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(100) NOT NULL,
        epc VARCHAR(255) NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(po_number, epc)
      );
    `);

    // Step 4: Check if this EPC was already processed for this PO
    const epcCheckQuery = `
      SELECT epc FROM processed_epcs WHERE po_number = $1 AND epc = $2;
    `;
    const epcCheckResult = await client.query(epcCheckQuery, [po_number, scanData.epc]);

    if (epcCheckResult.rows.length > 0) {
      // EPC already processed - skip and return existing inbound
      console.log(`⚠️ EPC ${scanData.epc} already processed for ${po_number} - Skipping (no quantity change)`);
      await client.query('ROLLBACK');
      
      // Get existing inbound record
      const existingQuery = `SELECT * FROM inbound WHERE po_number = $1`;
      const existingResult = await pool.query(existingQuery, [po_number]);
      
      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        const existingInbound = {
          ...existing,
          items: Array.isArray(existing.items) ? existing.items : JSON.parse(existing.items),
        };

        // Still emit socket event to show on dashboard (but with isDuplicate flag)
        try {
          const io = getSocketInstance();
          if (io) {
            // Find the item in existing inbound
            const existingItem = existingInbound.items.find(
              (item: IInboundItem) => item.item_number === item_number
            );

            io.emit('inbound:new-scan', {
              po_number,
              item_number,
              item_description,
              quantity: existingItem ? existingItem.quantity : Number(quantity),
              scanned_quantity: Number(quantity),
              lot_no,
              timestamp: new Date().toISOString(),
              epc: scanData.epc,
              isDuplicate: true,  // Mark as duplicate scan
            });
            console.log(`✅ Socket event emitted (duplicate scan) for ${po_number}`);
          }
        } catch (socketError) {
          console.error('Socket emit error (non-critical):', socketError);
        }

        return existingInbound;
      }
      return null;
    }

    // Mark this EPC as processed immediately
    await client.query(
      'INSERT INTO processed_epcs (po_number, epc) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [po_number, scanData.epc]
    );
    console.log(`✅ EPC ${scanData.epc} marked as processed for ${po_number}`);

    // Step 5: Check if inbound record exists for this PO
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
      // PostgreSQL JSONB automatically returns as object, no need to parse
      inboundRecord.items = Array.isArray(inboundRecord.items) 
        ? inboundRecord.items 
        : JSON.parse(inboundRecord.items as any);
      
      console.log('✨ New inbound created:', { id: inboundRecord.id, po_number });
    } else {
      // Inbound record exists - update items JSON
      const existingInbound = inboundResult.rows[0];
      // PostgreSQL JSONB returns as object, not string
      let items: IInboundItem[] = Array.isArray(existingInbound.items)
        ? existingInbound.items
        : JSON.parse(existingInbound.items as any);
      
      console.log('📦 Existing inbound found:', { id: existingInbound.id, items_count: items.length });

      // Find if item already exists in the items array
      const existingItemIndex = items.findIndex(
        (item) => item.item_number === item_number
      );

      let finalQuantity: number;
      let isNewItem: boolean;

      if (existingItemIndex !== -1) {
        // Item exists - increase quantity
        items[existingItemIndex].quantity += Number(quantity);
        finalQuantity = items[existingItemIndex].quantity;
        isNewItem = false;
        console.log(`📈 Quantity increased for ${item_number}: ${items[existingItemIndex].quantity - Number(quantity)} → ${finalQuantity}`);
      } else {
        // Item doesn't exist - add new item
        items.push({
          item_number,
          item_description,
          lot_no,
          quantity: Number(quantity),
        });
        finalQuantity = Number(quantity);
        isNewItem = true;
        console.log(`✨ New item added: ${item_number} with quantity ${finalQuantity}`);
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
      // PostgreSQL JSONB automatically returns as object
      inboundRecord.items = Array.isArray(inboundRecord.items)
        ? inboundRecord.items
        : JSON.parse(inboundRecord.items as any);
      
      console.log('✅ Inbound updated:', { id: inboundRecord.id, items_count: inboundRecord.items.length });
    }

    await client.query('COMMIT');

    // Get the final quantity from the inbound record
    const finalItemData = inboundRecord.items.find(
      (item: IInboundItem) => item.item_number === item_number
    );
    const displayQuantity = finalItemData ? finalItemData.quantity : Number(quantity);

    // Emit socket event for live dashboard
    try {
      const io = getSocketInstance();
      if (io) {
        io.emit('inbound:new-scan', {
          po_number,
          item_number,
          item_description,
          quantity: displayQuantity,  // Use aggregated quantity
          scanned_quantity: Number(quantity),  // Original scan quantity
          lot_no,
          timestamp: new Date().toISOString(),
          epc: scanData.epc,
        });
        console.log(`✅ Socket event emitted for ${po_number} - Item: ${item_number}, Total Qty: ${displayQuantity}`);
      } else {
        console.log('⚠️ Socket.IO not available, skipping event emit');
      }
    } catch (socketError) {
      console.error('Socket emit error (non-critical):', socketError);
      // Don't throw - socket error shouldn't break the main flow
    }

    return inboundRecord;
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;

    // Log the actual error for debugging
    console.error('Inbound processing error:', error);

    // Extract proper error message
    let errorMessage = 'Failed to process RFID scan';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && error.message) {
      errorMessage = String(error.message);
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      errorMessage
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

  // PostgreSQL JSONB automatically returns as JavaScript objects
  const inbounds = result.rows.map((row) => ({
    ...row,
    items: Array.isArray(row.items) ? row.items : JSON.parse(row.items as any),
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

  const inbound = result.rows[0];
  return {
    ...inbound,
    items: Array.isArray(inbound.items) ? inbound.items : JSON.parse(inbound.items as any),
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

    const inbound = result.rows[0];
    return {
      ...inbound,
      items: Array.isArray(inbound.items) ? inbound.items : JSON.parse(inbound.items as any),
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

