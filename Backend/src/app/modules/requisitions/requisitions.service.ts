import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IRequisition, IRequisitionItem, IRequisitionWithItems } from './requisitions.interface';

const createRequisition = async (data: IRequisition & { items?: any[] }): Promise<IRequisitionWithItems | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert requisition
    const insertRequisitionQuery = `
      INSERT INTO requisitions 
        (requisition_number, requester_name, organization_code, status, requirement)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const requisitionValues = [
      data.requisition_number,
      data.requester_name ?? null,
      data.organization_code ?? null,
      data.status ?? 'open',
      data.requirement ?? null,
    ];

    const requisitionResult = await client.query(insertRequisitionQuery, requisitionValues);
    const requisition = requisitionResult.rows[0];

    // Insert requisition items if provided
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        const insertItemQuery = `
          INSERT INTO requisition_items 
            (requisition_id, item_id, quantity, uom, remarks)
          VALUES ($1, $2, $3, $4, $5);
        `;

        const itemValues = [
          requisition.id,
          item.item_id,
          item.quantity,
          item.uom ?? null,
          item.remarks ?? null,
        ];

        await client.query(insertItemQuery, itemValues);
      }
    }

    await client.query('COMMIT');

    // Return requisition with items
    return await getSingleRequisition(requisition.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getAllRequisitions = async (
  filters: Partial<IRequisition> & { 
    searchTerm?: string;
    created_at_from?: string;
    created_at_to?: string;
    updated_at_from?: string;
    updated_at_to?: string;
  },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IRequisitionWithItems[]>> => {
  const { 
    searchTerm, 
    created_at_from, 
    created_at_to, 
    updated_at_from, 
    updated_at_to,
    ...filterFields 
  } = filters;
  
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
    conditions.push(`(r.requisition_number ILIKE $${paramIndex} OR r.requester_name ILIKE $${paramIndex} OR r.requirement ILIKE $${paramIndex})`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Handle date range filtering
  if (created_at_from) {
    conditions.push(`r.created_at >= $${paramIndex}`);
    values.push(created_at_from);
    paramIndex++;
  }

  if (created_at_to) {
    conditions.push(`r.created_at <= $${paramIndex}`);
    values.push(created_at_to);
    paramIndex++;
  }

  if (updated_at_from) {
    conditions.push(`r.updated_at >= $${paramIndex}`);
    values.push(updated_at_from);
    paramIndex++;
  }

  if (updated_at_to) {
    conditions.push(`r.updated_at <= $${paramIndex}`);
    values.push(updated_at_to);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`r.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT r.*
    FROM requisitions r
    ${whereClause}
    ORDER BY r.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  // Get requisition items for all requisitions in a single query
  const requisitionIds = result.rows.map(r => r.id);
  let requisitionsWithItems: IRequisitionWithItems[] = result.rows.map(r => ({ ...r, items: [] }));

  if (requisitionIds.length > 0) {
    const itemsQuery = `
      SELECT 
        ri.id,
        ri.requisition_id,
        ri.item_id,
        ri.quantity,
        ri.uom,
        ri.remarks,
        ri.created_at,
        ri.updated_at,
        i.id as item_id,
        i.item_code,
        i.item_description,
        i.item_status,
        i.org_code,
        i.category_id,
        i.capex_opex,
        i.tracking_method,
        i.uom_primary,
        i.uom_secondary,
        i.conversion_to_primary,
        i.brand,
        i.model,
        i.manufacturer,
        i.hsn_code,
        i.barcode_upc,
        i.barcode_ean,
        i.gs1_gtin,
        i.rfid_supported,
        i.default_location_id,
        i.min_qty,
        i.max_qty,
        i.unit_weight_kg,
        i.unit_length_cm,
        i.unit_width_cm,
        i.unit_height_cm,
        i.images,
        i.specs,
        i.attributes,
        i.fusion_item_id,
        i.fusion_category,
        i.created_at as item_created_at,
        i.updated_at as item_updated_at
      FROM requisition_items ri
      LEFT JOIN items i ON ri.item_id = i.id
      WHERE ri.requisition_id = ANY($1)
      ORDER BY ri.requisition_id, ri.created_at ASC
    `;
    
    const itemsResult = await pool.query(itemsQuery, [requisitionIds]);
    
    // Group items by requisition_id
    const itemsByRequisitionId = itemsResult.rows.reduce((acc, row) => {
      if (!acc[row.requisition_id]) {
        acc[row.requisition_id] = [];
      }
      acc[row.requisition_id].push({
        id: row.id,
        requisition_id: row.requisition_id,
        item_id: row.item_id,
        quantity: row.quantity,
        uom: row.uom,
        remarks: row.remarks,
        created_at: row.created_at,
        updated_at: row.updated_at,
        item: {
          id: row.item_id,
          item_code: row.item_code,
          item_description: row.item_description,
          item_status: row.item_status,
          org_code: row.org_code,
          category_id: row.category_id,
          capex_opex: row.capex_opex,
          tracking_method: row.tracking_method,
          uom_primary: row.uom_primary,
          uom_secondary: row.uom_secondary,
          conversion_to_primary: row.conversion_to_primary,
          brand: row.brand,
          model: row.model,
          manufacturer: row.manufacturer,
          hsn_code: row.hsn_code,
          barcode_upc: row.barcode_upc,
          barcode_ean: row.barcode_ean,
          gs1_gtin: row.gs1_gtin,
          rfid_supported: row.rfid_supported,
          default_location_id: row.default_location_id,
          min_qty: row.min_qty,
          max_qty: row.max_qty,
          unit_weight_kg: row.unit_weight_kg,
          unit_length_cm: row.unit_length_cm,
          unit_width_cm: row.unit_width_cm,
          unit_height_cm: row.unit_height_cm,
          images: row.images,
          specs: row.specs,
          attributes: row.attributes,
          fusion_item_id: row.fusion_item_id,
          fusion_category: row.fusion_category,
          created_at: row.item_created_at,
          updated_at: row.item_updated_at
        }
      });
      return acc;
    }, {} as Record<number, any[]>);
    
    // Assign items to their respective requisitions
    requisitionsWithItems = requisitionsWithItems.map(requisition => ({
      ...requisition,
      items: itemsByRequisitionId[requisition.id!] || []
    }));
  }

  const countQuery = `SELECT COUNT(*) FROM requisitions r ${whereClause};`;
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
    data: requisitionsWithItems,
  };
};

const getSingleRequisition = async (id: number): Promise<IRequisitionWithItems | null> => {
  const query = `
    SELECT 
      r.*,
      json_agg(
        json_build_object(
          'id', ri.id,
          'requisition_id', ri.requisition_id,
          'item_id', ri.item_id,
          'quantity', ri.quantity,
          'uom', ri.uom,
          'remarks', ri.remarks,
          'created_at', ri.created_at,
          'updated_at', ri.updated_at,
          'item', json_build_object(
            'id', i.id,
            'item_code', i.item_code,
            'item_description', i.item_description,
            'item_status', i.item_status,
            'org_code', i.org_code,
            'category_id', i.category_id,
            'capex_opex', i.capex_opex,
            'tracking_method', i.tracking_method,
            'uom_primary', i.uom_primary,
            'uom_secondary', i.uom_secondary,
            'conversion_to_primary', i.conversion_to_primary,
            'brand', i.brand,
            'model', i.model,
            'manufacturer', i.manufacturer,
            'hsn_code', i.hsn_code,
            'barcode_upc', i.barcode_upc,
            'barcode_ean', i.barcode_ean,
            'gs1_gtin', i.gs1_gtin,
            'rfid_supported', i.rfid_supported,
            'default_location_id', i.default_location_id,
            'min_qty', i.min_qty,
            'max_qty', i.max_qty,
            'unit_weight_kg', i.unit_weight_kg,
            'unit_length_cm', i.unit_length_cm,
            'unit_width_cm', i.unit_width_cm,
            'unit_height_cm', i.unit_height_cm,
            'images', i.images,
            'specs', i.specs,
            'attributes', i.attributes,
            'fusion_item_id', i.fusion_item_id,
            'fusion_category', i.fusion_category,
            'created_at', i.created_at,
            'updated_at', i.updated_at
          )
        )
      ) FILTER (WHERE ri.id IS NOT NULL) as items
    FROM requisitions r
    LEFT JOIN requisition_items ri ON r.id = ri.requisition_id
    LEFT JOIN items i ON ri.item_id = i.id
    WHERE r.id = $1
    GROUP BY r.id;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
  }

  const requisition = result.rows[0];
  return {
    ...requisition,
    items: requisition.items || [],
  };
};

const updateRequisition = async (
  id: number,
  data: Partial<IRequisition> & { items?: any[] }
): Promise<IRequisitionWithItems | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Validate that we have some data to update
    if (Object.keys(data).length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    // Check if requisition exists
    const requisitionCheck = await client.query(
      'SELECT id FROM requisitions WHERE id = $1',
      [id]
    );

    if (requisitionCheck.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
    }

    // Update requisition fields
    const { items, ...requisitionData } = data;
    const requisitionFields = Object.keys(requisitionData);
    
    if (requisitionFields.length > 0) {
      const setClause = requisitionFields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(', ');
      
      const values = requisitionFields.map(field => (requisitionData as any)[field]);
      values.push(id);

      const updateQuery = `
        UPDATE requisitions
        SET ${setClause}, updated_at = NOW()
        WHERE id = $${requisitionFields.length + 1}
        RETURNING *;
      `;

      await client.query(updateQuery, values);
    }

    // Handle requisition items update if provided
    if (items !== undefined) {
      // Delete existing items
      await client.query(
        'DELETE FROM requisition_items WHERE requisition_id = $1',
        [id]
      );

      // Insert new items if provided
      if (items && items.length > 0) {
        // First, validate that all items exist
        const itemIds = items.map(item => item.item_id);
        const itemCheckQuery = `
          SELECT id FROM items WHERE id = ANY($1)
        `;
        const itemCheckResult = await client.query(itemCheckQuery, [itemIds]);
        
        if (itemCheckResult.rows.length !== itemIds.length) {
          const existingItemIds = itemCheckResult.rows.map(row => row.id);
          const missingItemIds = itemIds.filter(id => !existingItemIds.includes(id));
          throw new ApiError(
            httpStatus.BAD_REQUEST, 
            `Items with IDs [${missingItemIds.join(', ')}] do not exist`
          );
        }

        for (const item of items) {
          // Validate required fields
          if (!item.item_id || !item.quantity) {
            throw new ApiError(
              httpStatus.BAD_REQUEST, 
              'Each item must have item_id and quantity'
            );
          }

          const insertItemQuery = `
            INSERT INTO requisition_items 
              (requisition_id, item_id, quantity, uom, remarks)
            VALUES ($1, $2, $3, $4, $5);
          `;

          const itemValues = [
            id,
            item.item_id,
            item.quantity,
            item.uom ?? null,
            item.remarks ?? null,
          ];

          await client.query(insertItemQuery, itemValues);
        }
      }
    }

    await client.query('COMMIT');

    // Return updated requisition with items using the same client
    const query = `
      SELECT 
        r.*,
        json_agg(
          json_build_object(
            'id', ri.id,
            'requisition_id', ri.requisition_id,
            'item_id', ri.item_id,
            'quantity', ri.quantity,
            'uom', ri.uom,
            'remarks', ri.remarks,
            'created_at', ri.created_at,
            'updated_at', ri.updated_at,
            'item', json_build_object(
              'id', i.id,
              'item_code', i.item_code,
              'item_description', i.item_description,
              'item_status', i.item_status,
              'org_code', i.org_code,
              'category_id', i.category_id,
              'capex_opex', i.capex_opex,
              'tracking_method', i.tracking_method,
              'uom_primary', i.uom_primary,
              'uom_secondary', i.uom_secondary,
              'conversion_to_primary', i.conversion_to_primary,
              'brand', i.brand,
              'model', i.model,
              'manufacturer', i.manufacturer,
              'hsn_code', i.hsn_code,
              'barcode_upc', i.barcode_upc,
              'barcode_ean', i.barcode_ean,
              'gs1_gtin', i.gs1_gtin,
              'rfid_supported', i.rfid_supported,
              'default_location_id', i.default_location_id,
              'min_qty', i.min_qty,
              'max_qty', i.max_qty,
              'unit_weight_kg', i.unit_weight_kg,
              'unit_length_cm', i.unit_length_cm,
              'unit_width_cm', i.unit_width_cm,
              'unit_height_cm', i.unit_height_cm,
              'images', i.images,
              'specs', i.specs,
              'attributes', i.attributes,
              'fusion_item_id', i.fusion_item_id,
              'fusion_category', i.fusion_category,
              'created_at', i.created_at,
              'updated_at', i.updated_at
            )
          )
        ) FILTER (WHERE ri.id IS NOT NULL) as items
      FROM requisitions r
      LEFT JOIN requisition_items ri ON r.id = ri.requisition_id
      LEFT JOIN items i ON ri.item_id = i.id
      WHERE r.id = $1
      GROUP BY r.id;
    `;

    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
    }

    const requisition = result.rows[0];
    return {
      ...requisition,
      items: requisition.items || [],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
    
    // Log the actual error for debugging
    console.error('Update requisition error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to update requisition: ${error.message}`);
    }
    
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update requisition');
  } finally {
    client.release();
  }
};

const deleteRequisition = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM requisitions WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete requisition');
  }
};

// Requisition Items Services
const addRequisitionItem = async (
  requisitionId: number,
  data: Omit<IRequisitionItem, 'requisition_id'>
): Promise<IRequisitionItem> => {
  try {
    // Check if requisition exists
    const requisitionCheck = await pool.query(
      'SELECT id FROM requisitions WHERE id = $1',
      [requisitionId]
    );

    if (requisitionCheck.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Requisition not found');
    }

    const insertQuery = `
      INSERT INTO requisition_items 
        (requisition_id, item_id, quantity, uom, remarks)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      requisitionId,
      data.item_id,
      data.quantity,
      data.uom ?? null,
      data.remarks ?? null,
    ];

    const result = await pool.query(insertQuery, values);
    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to add requisition item');
  }
};

const updateRequisitionItem = async (
  id: number,
  data: Partial<Omit<IRequisitionItem, 'requisition_id' | 'item_id'>>
): Promise<IRequisitionItem | null> => {
  try {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    
    const values = fields.map(field => (data as any)[field]);
    values.push(id);

    const query = `
      UPDATE requisition_items
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Requisition item not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update requisition item');
  }
};

const deleteRequisitionItem = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM requisition_items WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Requisition item not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete requisition item');
  }
};

const getSingleRequisitionItem = async (id: number): Promise<IRequisitionWithItems | null> => {
  const query = `
    SELECT 
      ri.*,
      json_build_object(
        'id', i.id,
        'item_code', i.item_code,
        'item_description', i.item_description,
        'item_status', i.item_status,
        'org_code', i.org_code,
        'category_id', i.category_id,
        'capex_opex', i.capex_opex,
        'tracking_method', i.tracking_method,
        'uom_primary', i.uom_primary,
        'uom_secondary', i.uom_secondary,
        'conversion_to_primary', i.conversion_to_primary,
        'brand', i.brand,
        'model', i.model,
        'manufacturer', i.manufacturer,
        'hsn_code', i.hsn_code,
        'barcode_upc', i.barcode_upc,
        'barcode_ean', i.barcode_ean,
        'gs1_gtin', i.gs1_gtin,
        'rfid_supported', i.rfid_supported,
        'default_location_id', i.default_location_id,
        'min_qty', i.min_qty,
        'max_qty', i.max_qty,
        'unit_weight_kg', i.unit_weight_kg,
        'unit_length_cm', i.unit_length_cm,
        'unit_width_cm', i.unit_width_cm,
        'unit_height_cm', i.unit_height_cm,
        'images', i.images,
        'specs', i.specs,
        'attributes', i.attributes,
        'fusion_item_id', i.fusion_item_id,
        'fusion_category', i.fusion_category,
        'created_at', i.created_at,
        'updated_at', i.updated_at
      ) as item
    FROM requisition_items ri
    LEFT JOIN items i ON ri.item_id = i.id
    WHERE ri.id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Requisition item not found');
  }

  return result.rows[0];
};

export const RequisitionService = {
  createRequisition,
  getAllRequisitions,
  getSingleRequisition,
  updateRequisition,
  deleteRequisition,
  addRequisitionItem,
  updateRequisitionItem,
  deleteRequisitionItem,
  getSingleRequisitionItem,
};
