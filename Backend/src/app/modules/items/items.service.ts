import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IItem } from './items.interface';

const createItem = async (data: IItem): Promise<IItem | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO items 
        (item_code, item_description, item_status, org_code, category_id, capex_opex, 
         tracking_method, uom_primary, uom_secondary, conversion_to_primary, brand, 
         model, manufacturer, hsn_code, barcode_upc, barcode_ean, gs1_gtin, 
         rfid_supported, default_location_id, min_qty, max_qty, unit_weight_kg, 
         unit_length_cm, unit_width_cm, unit_height_cm, images, specs, attributes, 
         fusion_item_id, fusion_category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
              $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
      RETURNING *;
    `;

    const values = [
      data.item_code,
      data.item_description ?? null,
      data.item_status ?? 'active',
      data.org_code ?? null,
      data.category_id ?? null,
      data.capex_opex ?? null,
      data.tracking_method,
      data.uom_primary,
      data.uom_secondary ?? null,
      data.conversion_to_primary ?? null,
      data.brand ?? null,
      data.model ?? null,
      data.manufacturer ?? null,
      data.hsn_code ?? null,
      data.barcode_upc ?? null,
      data.barcode_ean ?? null,
      data.gs1_gtin ?? null,
      data.rfid_supported ?? true,
      data.default_location_id ?? null,
      data.min_qty ?? 0,
      data.max_qty ?? null,
      data.unit_weight_kg ?? null,
      data.unit_length_cm ?? null,
      data.unit_width_cm ?? null,
      data.unit_height_cm ?? null,
      data.images ? data.images : null,
      data.specs ? JSON.stringify(data.specs) : '{}',
      data.attributes ? JSON.stringify(data.attributes) : '{}',
      data.fusion_item_id ?? null,
      data.fusion_category ?? null,
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

const getAllItems = async (
  filters: Partial<IItem> & { 
    searchTerm?: string;
    min_qty_min?: number;
    min_qty_max?: number;
    max_qty_min?: number;
    max_qty_max?: number;
    unit_weight_min?: number;
    unit_weight_max?: number;
  },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IItem[]>> => {
  const { 
    searchTerm, 
    min_qty_min, 
    min_qty_max, 
    max_qty_min, 
    max_qty_max, 
    unit_weight_min, 
    unit_weight_max,
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
    conditions.push(`(i.item_code ILIKE $${paramIndex} OR i.item_description ILIKE $${paramIndex} OR i.brand ILIKE $${paramIndex} OR i.model ILIKE $${paramIndex} OR i.manufacturer ILIKE $${paramIndex})`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Handle quantity range filtering
  if (min_qty_min !== undefined) {
    conditions.push(`i.min_qty >= $${paramIndex}`);
    values.push(min_qty_min);
    paramIndex++;
  }

  if (min_qty_max !== undefined) {
    conditions.push(`i.min_qty <= $${paramIndex}`);
    values.push(min_qty_max);
    paramIndex++;
  }

  if (max_qty_min !== undefined) {
    conditions.push(`i.max_qty >= $${paramIndex}`);
    values.push(max_qty_min);
    paramIndex++;
  }

  if (max_qty_max !== undefined) {
    conditions.push(`i.max_qty <= $${paramIndex}`);
    values.push(max_qty_max);
    paramIndex++;
  }

  // Handle weight range filtering
  if (unit_weight_min !== undefined) {
    conditions.push(`i.unit_weight_kg >= $${paramIndex}`);
    values.push(unit_weight_min);
    paramIndex++;
  }

  if (unit_weight_max !== undefined) {
    conditions.push(`i.unit_weight_kg <= $${paramIndex}`);
    values.push(unit_weight_max);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`i.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      i.*,
      COALESCE(i.specs, '{}'::jsonb) as specs,
      COALESCE(i.attributes, '{}'::jsonb) as attributes,
      COALESCE(i.images, '{}'::text[]) as images,
      row_to_json(c) as category,
      row_to_json(l) as default_location
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN locations l ON i.default_location_id = l.id
    ${whereClause}
    ORDER BY i.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM items i ${whereClause};`;
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

const getSingleItem = async (id: number): Promise<IItem | null> => {
  const query = `
    SELECT 
      i.*,
      COALESCE(i.specs, '{}'::jsonb) as specs,
      COALESCE(i.attributes, '{}'::jsonb) as attributes,
      COALESCE(i.images, '{}'::text[]) as images,
      row_to_json(c) as category,
      row_to_json(l) as default_location
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    LEFT JOIN locations l ON i.default_location_id = l.id
    WHERE i.id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
  }

  return result.rows[0];
};

const updateItem = async (
  id: number,
  data: Partial<IItem>
): Promise<IItem | null> => {
  try {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => {
        if (field === 'specs' || field === 'attributes') {
          return `${field} = $${index + 1}::jsonb`;
        }
        if (field === 'images') {
          return `${field} = $${index + 1}::text[]`;
        }
        return `${field} = $${index + 1}`;
      })
      .join(', ');
    
    const values = fields.map(field => {
      if (field === 'specs' || field === 'attributes') {
        return JSON.stringify((data as any)[field] || {});
      }
      if (field === 'images') {
        return (data as any)[field] || [];
      }
      return (data as any)[field];
    });
    values.push(id);

    const query = `
      UPDATE items
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update item');
  }
};

const deleteItem = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM items WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Item not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete item');
  }
};

export const ItemService = {
  createItem,
  getAllItems,
  getSingleItem,
  updateItem,
  deleteItem,
};
