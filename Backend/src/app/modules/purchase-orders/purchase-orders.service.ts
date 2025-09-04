import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import {
  ICreatePurchaseOrderComplete,
  IPurchaseOrder,
  IPurchaseOrderComplete,
  IUpdatePurchaseOrder
} from './purchase-orders.interface';

const createPurchaseOrder = async (
  data: ICreatePurchaseOrderComplete
): Promise<IPurchaseOrderComplete | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert purchase order
    const insertPoQuery = `
      INSERT INTO purchase_orders 
        (po_number, vendor_id, total_amount, requisition_id, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const poValues = [
      data.po_number,
      data.vendor_id,
      data.total_amount ?? null,
      data.requisition_id ?? null,
      data.status ?? 'pending',
    ];

    const poResult = await client.query(insertPoQuery, poValues);
    const purchaseOrder = poResult.rows[0];
    const poId = purchaseOrder.id;

    // Insert PO items if provided
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const insertItemQuery = `
          INSERT INTO po_items 
            (po_id, item_id, quantity, unit)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `;

        const itemValues = [poId, item.item_id, item.quantity, item.unit];
        const itemResult = await client.query(insertItemQuery, itemValues);
        const poItem = itemResult.rows[0];

        // Insert RFID tags if provided
        if (item.rfid_tags && item.rfid_tags.length > 0) {
          for (const rfid of item.rfid_tags) {
            const insertRfidQuery = `
              INSERT INTO po_items_rfid 
                (po_item_id, rfid_id, quantity)
              VALUES ($1, $2, $3)
              RETURNING *;
            `;

            const rfidValues = [poItem.id, rfid.rfid_id, rfid.quantity ?? 1];
            await client.query(insertRfidQuery, rfidValues);
          }
        }
      }
    }

    await client.query('COMMIT');

    // Return the complete purchase order with items and RFID
    return await getSinglePurchaseOrder(poId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getAllPurchaseOrders = async (
  filters: Partial<IPurchaseOrder> & { searchTerm?: string },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IPurchaseOrderComplete[]>> => {
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
    conditions.push(`(po.po_number ILIKE $${paramIndex})`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`po.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      po.*,
      v.name as vendor_name,
      v.vendor_code as vendor_code
    FROM purchase_orders po
    LEFT JOIN vendors v ON po.vendor_id = v.id
    ${whereClause}
    ORDER BY po.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  // Populate items and RFID for each purchase order
  const purchaseOrdersWithItems: IPurchaseOrderComplete[] = [];
  
  for (const po of result.rows) {
    // Get PO items
    const itemsQuery = `
      SELECT 
        pi.*,
        i.item_code,
        i.item_description,
        i.uom_primary
      FROM po_items pi
      LEFT JOIN items i ON pi.item_id = i.id
      WHERE pi.po_id = $1;
    `;

    const itemsResult = await pool.query(itemsQuery, [po.id]);
    const items = itemsResult.rows;

    // Get RFID tags for each item
    for (const item of items) {
      const rfidQuery = `
        SELECT 
          pir.*,
          rt.tag_uid,
          rt.status as rfid_status
        FROM po_items_rfid pir
        LEFT JOIN rfid_tags rt ON pir.rfid_id = rt.id
        WHERE pir.po_item_id = $1;
      `;

      const rfidResult = await pool.query(rfidQuery, [item.id]);
      item.rfid_tags = rfidResult.rows;
    }

    purchaseOrdersWithItems.push({
      ...po,
      items,
    });
  }

  const countQuery = `SELECT COUNT(*) FROM purchase_orders po ${whereClause};`;
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
    data: purchaseOrdersWithItems,
  };
};

const getSinglePurchaseOrder = async (id: number): Promise<IPurchaseOrderComplete | null> => {
  const client = await pool.connect();
  try {
    // Get purchase order
    const poQuery = `
      SELECT 
        po.*,
        v.name as vendor_name,
        v.vendor_code as vendor_code
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE po.id = $1;
    `;

    const poResult = await client.query(poQuery, [id]);
    if (poResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
    }

    const purchaseOrder = poResult.rows[0];

    // Get PO items
    const itemsQuery = `
      SELECT 
        pi.*,
        i.item_code,
        i.item_description,
        i.uom_primary
      FROM po_items pi
      LEFT JOIN items i ON pi.item_id = i.id
      WHERE pi.po_id = $1;
    `;

    const itemsResult = await client.query(itemsQuery, [id]);
    const items = itemsResult.rows;

    // Get RFID tags for each item
    for (const item of items) {
      const rfidQuery = `
        SELECT 
          pir.*,
          rt.tag_uid,
          rt.status as rfid_status
        FROM po_items_rfid pir
        LEFT JOIN rfid_tags rt ON pir.rfid_id = rt.id
        WHERE pir.po_item_id = $1;
      `;

      const rfidResult = await client.query(rfidQuery, [item.id]);
      item.rfid_tags = rfidResult.rows;
    }

    return {
      ...purchaseOrder,
      items,
    };
  } finally {
    client.release();
  }
};



const updatePurchaseOrder = async (
  id: number,
  data: IUpdatePurchaseOrder
): Promise<IPurchaseOrderComplete | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if purchase order exists
    const checkQuery = `SELECT id FROM purchase_orders WHERE id = $1;`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
    }

    // Update purchase order fields
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.po_number !== undefined) {
      updateFields.push(`po_number = $${paramIndex++}`);
      values.push(data.po_number);
    }

    if (data.vendor_id !== undefined) {
      updateFields.push(`vendor_id = $${paramIndex++}`);
      values.push(data.vendor_id);
    }

    if (data.total_amount !== undefined) {
      updateFields.push(`total_amount = $${paramIndex++}`);
      values.push(data.total_amount);
    }

    if (data.requisition_id !== undefined) {
      updateFields.push(`requisition_id = $${paramIndex++}`);
      values.push(data.requisition_id);
    }

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length > 0) {
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
    if (data.items && data.items.length > 0) {
      // Delete existing items and RFID associations
      await client.query('DELETE FROM po_items_rfid WHERE po_item_id IN (SELECT id FROM po_items WHERE po_id = $1);', [id]);
      await client.query('DELETE FROM po_items WHERE po_id = $1;', [id]);

      // Insert new items
      for (const item of data.items) {
        const insertItemQuery = `
          INSERT INTO po_items 
            (po_id, item_id, quantity, unit)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `;

        const itemValues = [id, item.item_id, item.quantity, item.unit];
        const itemResult = await client.query(insertItemQuery, itemValues);
        const poItem = itemResult.rows[0];

        // Insert RFID tags if provided
        if ('rfid_tags' in item && item.rfid_tags && Array.isArray(item.rfid_tags) && item.rfid_tags.length > 0) {
          for (const rfid of item.rfid_tags) {
            const insertRfidQuery = `
              INSERT INTO po_items_rfid 
                (po_item_id, rfid_id, quantity)
              VALUES ($1, $2, $3)
              RETURNING *;
            `;

            const rfidValues = [poItem.id, rfid.rfid_id, rfid.quantity ?? 1];
            await client.query(insertRfidQuery, rfidValues);
          }
        }
      }
    }

    await client.query('COMMIT');

    // Return the updated purchase order
    return await getSinglePurchaseOrder(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deletePurchaseOrder = async (id: number): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if purchase order exists
    const checkQuery = `SELECT id FROM purchase_orders WHERE id = $1;`;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase order not found');
    }

    // Delete purchase order (cascade will handle po_items and po_items_rfid)
    const deleteQuery = `DELETE FROM purchase_orders WHERE id = $1;`;
    await client.query(deleteQuery, [id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const PurchaseOrderService = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getSinglePurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
};
