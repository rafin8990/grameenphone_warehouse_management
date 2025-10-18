import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import {
  ICreatePurchaseOrder,
  IPurchaseOrderFilters,
  IPurchaseOrderWithItems,
  IUpdatePurchaseOrder,
} from './purchase-orders.interface';

const createPurchaseOrder = async (
  data: ICreatePurchaseOrder
): Promise<IPurchaseOrderWithItems | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert purchase order
    const insertPoQuery = `
      INSERT INTO purchase_orders 
        (po_number, po_description, supplier_name, po_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const poValues = [
      data.po_number,
      data.po_description ?? null,
      data.supplier_name,
      data.po_type ?? null,
    ];

    const poResult = await client.query(insertPoQuery, poValues);
    const purchaseOrder = poResult.rows[0];
    const poId = purchaseOrder.id;



    // Insert PO items if provided
    if (data.po_items && data.po_items.length > 0) {
      for (const item of data.po_items) {
        
        // Verify that item_number exists
        const itemCheckQuery = `
          SELECT item_number FROM items WHERE item_number = $1;
        `;
        const itemCheckResult = await client.query(itemCheckQuery, [
          item.item_number,
        ]);

        if (itemCheckResult.rows.length === 0) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Item with number '${item.item_number}' not found`
          );
        }

        const insertItemQuery = `
          INSERT INTO po_items 
            (po_id, item_number, quantity)
          VALUES ($1, $2, $3)
          RETURNING *;
        `;

        const itemValues = [poId, item.item_number, item.quantity];
        const insertResult = await client.query(insertItemQuery, itemValues);
      }
    } else {
    }

    await client.query('COMMIT');

    // Fetch all items with details for this PO
    const itemsQuery = `
      SELECT 
        pi.id,
        pi.po_id,
        pi.item_number,
        pi.quantity,
        pi.created_at,
        pi.updated_at,
        i.id as item_id,
        i.item_number as item_code,
        i.item_description,
        i.item_type,
        i.inventory_organization,
        i.primary_uom,
        i.uom_code,
        i.item_status
      FROM po_items pi
      INNER JOIN items i ON pi.item_number = i.item_number
      WHERE pi.po_id = $1
      ORDER BY pi.id;
    `;

    const itemsResult = await client.query(itemsQuery, [poId]);

    // Return the complete purchase order with items
    return {
      ...purchaseOrder,
      items: itemsResult.rows,
    };
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;

    // Handle foreign key constraint violation
    if (error.code === '23503') {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Referenced item does not exist'
      );
    }

    // Handle duplicate PO number
    if (error.code === '23505') {
      throw new ApiError(httpStatus.CONFLICT, 'PO number already exists');
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create purchase order'
    );
  } finally {
    client.release();
  }
};

const getAllPurchaseOrders = async (
  filters: IPurchaseOrderFilters,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IPurchaseOrderWithItems[]>> => {
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
      `(po.po_number ILIKE $${paramIndex} OR po.supplier_name ILIKE $${paramIndex} OR po.po_description ILIKE $${paramIndex} OR po.po_type ILIKE $${paramIndex})`
    );
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Specific field filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`po.${field} = $${paramIndex}`);
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
    'po_description',
    'supplier_name',
    'po_type',
    'status',
    'created_at',
    'updated_at',
    'received_at',
  ];

  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const query = `
    SELECT 
      po.id,
      po.po_number,
      po.po_description,
      po.supplier_name,
      po.po_type,
      po.status,
      po.created_at,
      po.updated_at,
      po.received_at,
      COUNT(pi.id)::int as total_items,
      SUM(pi.quantity)::int as total_ordered_quantity,
      COALESCE(inbound_data.total_received_quantity, 0)::int as total_received_quantity
    FROM purchase_orders po
    LEFT JOIN po_items pi ON po.id = pi.po_id
    LEFT JOIN (
      SELECT 
        po_number,
        SUM((item->>'quantity')::numeric) as total_received_quantity
      FROM inbound,
      LATERAL jsonb_array_elements(items) as item
      GROUP BY po_number
    ) inbound_data ON po.po_number = inbound_data.po_number
    ${whereClause}
    GROUP BY po.id, po.status, po.received_at, inbound_data.total_received_quantity
    ORDER BY po.${safeSortBy} ${safeSortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  // Populate items for each purchase order
  const purchaseOrdersWithItems: IPurchaseOrderWithItems[] = [];

  for (const po of result.rows) {
    // Get PO items with item details and received quantities
    const itemsQuery = `
      SELECT 
        pi.id,
        pi.po_id,
        pi.item_number,
        pi.quantity as ordered_quantity,
        pi.created_at,
        pi.updated_at,
        i.id as item_id,
        i.item_number as item_code,
        i.item_description,
        i.item_type,
        i.inventory_organization,
        i.primary_uom,
        i.uom_code,
        i.item_status,
        COALESCE(received_data.received_quantity, 0)::int as received_quantity
      FROM po_items pi
      INNER JOIN items i ON pi.item_number = i.item_number
      LEFT JOIN (
        SELECT 
          item->>'item_number' as item_number,
          SUM(COALESCE((item->>'quantity')::numeric, 0)) as received_quantity
        FROM inbound,
        LATERAL jsonb_array_elements(items) as item
        WHERE po_number = $2
        GROUP BY item->>'item_number'
      ) received_data ON pi.item_number = received_data.item_number
      WHERE pi.po_id = $1
      ORDER BY pi.id;
    `;

    const itemsResult = await pool.query(itemsQuery, [po.id, po.po_number]);

    purchaseOrdersWithItems.push({
      id: po.id,
      po_number: po.po_number,
      po_description: po.po_description,
      supplier_name: po.supplier_name,
      po_type: po.po_type,
      status: po.status,
      created_at: po.created_at,
      updated_at: po.updated_at,
      received_at: po.received_at,
      total_items: po.total_items,
      total_ordered_quantity: po.total_ordered_quantity,
      total_received_quantity: po.total_received_quantity,
      items: itemsResult.rows,
    });
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) FROM purchase_orders po ${whereClause};`;
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
    data: purchaseOrdersWithItems,
  };
};

const getSinglePurchaseOrder = async (
  id: number
): Promise<IPurchaseOrderWithItems | null> => {
  const client = await pool.connect();
  try {
    // Get purchase order with totals
    const poQuery = `
      SELECT 
        po.id,
        po.po_number,
        po.po_description,
        po.supplier_name,
        po.po_type,
        po.status,
        po.created_at,
        po.updated_at,
        po.received_at,
        COUNT(pi.id)::int as total_items,
        SUM(pi.quantity)::int as total_ordered_quantity,
        COALESCE(inbound_data.total_received_quantity, 0)::int as total_received_quantity
      FROM purchase_orders po
      LEFT JOIN po_items pi ON po.id = pi.po_id
      LEFT JOIN (
        SELECT 
          po_number,
          SUM((item->>'quantity')::numeric) as total_received_quantity
        FROM inbound,
        LATERAL jsonb_array_elements(items) as item
        GROUP BY po_number
      ) inbound_data ON po.po_number = inbound_data.po_number
      WHERE po.id = $1
      GROUP BY po.id, po.status, po.received_at, inbound_data.total_received_quantity;
    `;

    const poResult = await client.query(poQuery, [id]);
    if (poResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
    }

    const purchaseOrder = poResult.rows[0];

    // Get PO items with item details and received quantities
    const itemsQuery = `
      SELECT 
        pi.id,
        pi.po_id,
        pi.item_number,
        pi.quantity as ordered_quantity,
        pi.created_at,
        pi.updated_at,
        i.id as item_id,
        i.item_number as item_code,
        i.item_description,
        i.item_type,
        i.inventory_organization,
        i.primary_uom,
        i.uom_code,
        i.item_status,
        COALESCE(received_data.received_quantity, 0)::int as received_quantity
      FROM po_items pi
      INNER JOIN items i ON pi.item_number = i.item_number
      LEFT JOIN (
        SELECT 
          item->>'item_number' as item_number,
          SUM(COALESCE((item->>'quantity')::numeric, 0)) as received_quantity
        FROM inbound,
        LATERAL jsonb_array_elements(items) as item
        WHERE po_number = $2
        GROUP BY item->>'item_number'
      ) received_data ON pi.item_number = received_data.item_number
      WHERE pi.po_id = $1
      ORDER BY pi.id;
    `;

    const itemsResult = await client.query(itemsQuery, [id, purchaseOrder.po_number]);

    return {
      ...purchaseOrder,
      total_items: purchaseOrder.total_items,
      total_ordered_quantity: purchaseOrder.total_ordered_quantity,
      total_received_quantity: purchaseOrder.total_received_quantity,
      items: itemsResult.rows,
    };
  } finally {
    client.release();
  }
};

const updatePurchaseOrderStatus = async (
  id: number,
  status: 'received' | 'partial' | 'cancelled'
): Promise<IPurchaseOrderWithItems | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the purchase order first to get po_number
    const poQuery = `SELECT po_number FROM purchase_orders WHERE id = $1::INTEGER`;
    const poResult = await client.query(poQuery, [id]);
    
    if (poResult.rows.length === 0) {
      throw new Error('Purchase order not found');
    }

    const po_number = poResult.rows[0].po_number;

    // Update the purchase order status
    const updateQuery = `
      UPDATE purchase_orders 
      SET status = $1::VARCHAR(20), 
          updated_at = CURRENT_TIMESTAMP,
          received_at = CASE 
            WHEN $1 = 'received' THEN CURRENT_TIMESTAMP 
            ELSE received_at 
          END
      WHERE id = $2::INTEGER
      RETURNING *;
    `;
    
    const updateResult = await client.query(updateQuery, [status, id]);
    
    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    // If status is 'received' or 'partial', add items to stock table
    if (status === 'received' || status === 'partial') {
      await addInboundItemsToStock(client, po_number);
    }

    await client.query('COMMIT');

    // Get the updated purchase order with items and totals
    return await getSinglePurchaseOrder(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Add inbound items to stock table with FIFO ordering
const addInboundItemsToStock = async (client: any, po_number: string): Promise<void> => {
  try {
    // Get all inbound records for this PO, ordered by created_at (FIFO)
    const inboundQuery = `
      SELECT items, created_at
      FROM inbound 
      WHERE po_number = $1::VARCHAR(100)
      ORDER BY created_at ASC
    `;
    
    const inboundResult = await client.query(inboundQuery, [String(po_number)]);
    
    if (inboundResult.rows.length === 0) {
      return; // No inbound records found
    }

    // Process each inbound record
    for (const inboundRecord of inboundResult.rows) {
      const items = Array.isArray(inboundRecord.items) 
        ? inboundRecord.items 
        : JSON.parse(inboundRecord.items as any);

      if (!Array.isArray(items)) continue;

      // Process each item in the inbound record
      for (const item of items) {
        const { item_number, quantity, lot_no } = item;
        
        if (!item_number || !quantity || !lot_no) continue;

        // Check if this exact combination already exists in stock
        const existingStockQuery = `
          SELECT id, quantity 
          FROM stocks 
          WHERE po_number = $1::VARCHAR(255) AND item_number = $2::VARCHAR(255) AND lot_no = $3::VARCHAR(255)
        `;
        
        const existingResult = await client.query(existingStockQuery, [
          String(po_number), 
          String(item_number), 
          String(lot_no)
        ]);
        
        if (existingResult.rows.length > 0) {
          // Update existing stock quantity
          const updateStockQuery = `
            UPDATE stocks 
            SET quantity = quantity + $1::INTEGER, updated_at = CURRENT_TIMESTAMP
            WHERE po_number = $2::VARCHAR(255) AND item_number = $3::VARCHAR(255) AND lot_no = $4::VARCHAR(255)
          `;
          
          await client.query(updateStockQuery, [
            Number(quantity), 
            String(po_number), 
            String(item_number), 
            String(lot_no)
          ]);
        } else {
          // Insert new stock record
          const insertStockQuery = `
            INSERT INTO stocks (po_number, item_number, quantity, lot_no, created_at, updated_at)
            VALUES ($1::VARCHAR(255), $2::VARCHAR(255), $3::INTEGER, $4::VARCHAR(255), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `;
          
          await client.query(insertStockQuery, [
            String(po_number), 
            String(item_number), 
            Number(quantity), 
            String(lot_no)
          ]);
        }
      }
    }
  } catch (error) {
    console.error('Error adding inbound items to stock:', error);
    throw error;
  }
};

// Get stock data with FIFO ordering (first posted items show first)
const getStockWithFIFO = async (po_number?: string): Promise<any[]> => {
  const client = await pool.connect();
  try {
    let query = `
      SELECT 
        s.id,
        s.po_number,
        s.item_number,
        s.quantity,
        s.lot_no,
        s.created_at,
        s.updated_at,
        i.item_description,
        i.primary_uom
      FROM stocks s
      LEFT JOIN items i ON s.item_number = i.item_number
    `;
    
    const params: any[] = [];
    
    if (po_number) {
      query += ` WHERE s.po_number = $1::VARCHAR(255)`;
      params.push(String(po_number));
    }
    
    // Order by created_at ASC to maintain FIFO (first posted items show first)
    query += ` ORDER BY s.created_at ASC, s.id ASC`;
    
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting stock with FIFO:', error);
    throw error;
  } finally {
    client.release();
  }
};

const updatePurchaseOrder = async (
  id: number,
  data: IUpdatePurchaseOrder
): Promise<IPurchaseOrderWithItems | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if purchase order exists
    const checkQuery = `SELECT id FROM purchase_orders WHERE id = $1;`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
    }

    // Update purchase order fields if provided
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.po_number !== undefined) {
      updateFields.push(`po_number = $${paramIndex++}`);
      values.push(data.po_number);
    }

    if (data.po_description !== undefined) {
      updateFields.push(`po_description = $${paramIndex++}`);
      values.push(data.po_description);
    }

    if (data.supplier_name !== undefined) {
      updateFields.push(`supplier_name = $${paramIndex++}`);
      values.push(data.supplier_name);
    }

    if (data.po_type !== undefined) {
      updateFields.push(`po_type = $${paramIndex++}`);
      values.push(data.po_type);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (values.length > 0) {
      const updateQuery = `
        UPDATE purchase_orders 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *;
      `;

      values.push(id);
      await client.query(updateQuery, values);
    }

    // Update items if provided
    if (data.po_items !== undefined) {
      // Delete existing items (CASCADE will handle this)
      await client.query('DELETE FROM po_items WHERE po_id = $1;', [id]);

      // Insert new items
      if (data.po_items.length > 0) {
        for (const item of data.po_items) {
          // Verify that item_number exists
          const itemCheckQuery = `
            SELECT item_number FROM items WHERE item_number = $1;
          `;
          const itemCheckResult = await client.query(itemCheckQuery, [
            item.item_number,
          ]);

          if (itemCheckResult.rows.length === 0) {
            throw new ApiError(
              httpStatus.BAD_REQUEST,
              `Item with number '${item.item_number}' not found`
            );
          }

          const insertItemQuery = `
            INSERT INTO po_items 
              (po_id, item_number, quantity)
            VALUES ($1, $2, $3)
            RETURNING *;
          `;

          const itemValues = [id, item.item_number, item.quantity];
          await client.query(insertItemQuery, itemValues);
        }
      }
    }

    await client.query('COMMIT');

    // Return the updated purchase order
    return await getSinglePurchaseOrder(id);
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;

    // Handle foreign key constraint violation
    if (error.code === '23503') {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Referenced item does not exist'
      );
    }

    // Handle duplicate PO number
    if (error.code === '23505') {
      throw new ApiError(httpStatus.CONFLICT, 'PO number already exists');
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update purchase order'
    );
  } finally {
    client.release();
  }
};

const deletePurchaseOrder = async (id: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First, get the PO number for this purchase order
    const poQuery = `SELECT po_number FROM purchase_orders WHERE id = $1;`;
    const poResult = await client.query(poQuery, [id]);

    if (poResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
    }

    const po_number = poResult.rows[0].po_number;

    // Delete related records first (in correct order to avoid foreign key violations)
    // 1. Delete from stocks table (references po_number)
    await client.query(`DELETE FROM stocks WHERE po_number = $1;`, [po_number]);
    
    // 2. Delete from location_tracker table (references po_number)
    await client.query(`DELETE FROM location_tracker WHERE po_number = $1;`, [po_number]);
    
    // 3. Delete from epc_tracking table (references po_number)
    await client.query(`DELETE FROM epc_tracking WHERE po_number = $1;`, [po_number]);
    
    // 4. Delete from inbound table (references po_number)
    await client.query(`DELETE FROM inbound WHERE po_number = $1;`, [po_number]);
    
    // 5. Finally delete the purchase order (po_items will cascade delete)
    await client.query(`DELETE FROM purchase_orders WHERE id = $1;`, [id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
    console.error('Delete purchase order error:', error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to delete purchase order'
    );
  } finally {
    client.release();
  }
};

const generatePONumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `GP-${currentYear}-`;

  const result = await pool.query(
    `SELECT po_number FROM purchase_orders 
     WHERE po_number LIKE $1 
     ORDER BY po_number DESC LIMIT 1`,
    [`${prefix}%`]
  );

  if (result.rows.length === 0) {
    return `${prefix}001`;
  }

  const lastPO = result.rows[0].po_number;
  
  const match = lastPO.match(/GP-\d{4}-(\d+)$/);
  if (match) {
    const lastNumber = parseInt(match[1], 10);
    const newNumber = lastNumber + 1;
    return `${prefix}${String(newNumber).padStart(3, '0')}`;
  }

  return `${prefix}001`;
};


const autoCreatePurchaseOrder = async (
  data: ICreatePurchaseOrder & { auto_generate_po_number?: boolean }
): Promise<IPurchaseOrderWithItems | null> => {
  let poNumber = data.po_number;
  
  if (data.auto_generate_po_number || !poNumber) {
    poNumber = await generatePONumber();
  }

  return await createPurchaseOrder({
    ...data,
    po_number: poNumber,
  });
};

// Quick Generate PO with fixed data (for automatic generation)
const quickGeneratePurchaseOrder = async (): Promise<IPurchaseOrderWithItems | null> => {
  // Fixed data for automatic PO generation
  const fixedData: ICreatePurchaseOrder = {
    po_number: '', // Will be auto-generated
    po_description: 'Purchase order for telecom items',
    supplier_name: 'Tech Supplies Ltd.',
    po_type: 'Standard Purchase',
    po_items: [
      {
        item_number: '500497359',
        quantity: 1000
      },
      {
        item_number: '500180440',
        quantity: 5000
      },
      {
        item_number: '3002379',
        quantity: 2500
      }
    ]
  };

  // Use auto-create to generate PO number and create PO
  return await autoCreatePurchaseOrder(fixedData);
};

export const PurchaseOrderService = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getSinglePurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  generatePONumber,
  autoCreatePurchaseOrder,
  quickGeneratePurchaseOrder,
  getStockWithFIFO,
};
