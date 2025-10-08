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
    'created_at',
    'updated_at',
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
      po.created_at,
      po.updated_at,
      COUNT(pi.id)::int as items_count
    FROM purchase_orders po
    LEFT JOIN po_items pi ON po.id = pi.po_id
    ${whereClause}
    GROUP BY po.id
    ORDER BY po.${safeSortBy} ${safeSortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  // Populate items for each purchase order
  const purchaseOrdersWithItems: IPurchaseOrderWithItems[] = [];

  for (const po of result.rows) {
    // Get PO items with item details
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

    const itemsResult = await pool.query(itemsQuery, [po.id]);

    purchaseOrdersWithItems.push({
      id: po.id,
      po_number: po.po_number,
      po_description: po.po_description,
      supplier_name: po.supplier_name,
      po_type: po.po_type,
      created_at: po.created_at,
      updated_at: po.updated_at,
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
    // Get purchase order
    const poQuery = `
      SELECT 
        po.*
      FROM purchase_orders po
      WHERE po.id = $1;
    `;

    const poResult = await client.query(poQuery, [id]);
    if (poResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
    }

    const purchaseOrder = poResult.rows[0];

    // Get PO items with item details
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

    const itemsResult = await client.query(itemsQuery, [id]);

    return {
      ...purchaseOrder,
      items: itemsResult.rows,
    };
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
    const checkQuery = `SELECT id FROM purchase_orders WHERE id = $1;`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
    }


    const deleteQuery = `DELETE FROM purchase_orders WHERE id = $1;`;
    await client.query(deleteQuery, [id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
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
  deletePurchaseOrder,
  generatePONumber,
  autoCreatePurchaseOrder,
  quickGeneratePurchaseOrder,
};
