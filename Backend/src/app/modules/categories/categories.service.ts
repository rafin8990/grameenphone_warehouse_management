import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { ICategory } from './categories.interface';

const createCategory = async (data: ICategory): Promise<ICategory | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO categories 
        (code, name, description, parent_id, status, fusion_category_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      data.code,
      data.name,
      data.description ?? null,
      data.parent_id ?? null,
      data.status ?? 'active',
      data.fusion_category_code ?? null,
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

const getAllItemCategories = async (
  filters: Partial<ICategory> & { searchTerm?: string },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<ICategory[]>> => {
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
    conditions.push(`(ic.name ILIKE $${paramIndex} OR ic.code ILIKE $${paramIndex})`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`ic.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      ic.*,
      row_to_json(p) as parent_category
    FROM categories ic
    LEFT JOIN categories p ON ic.parent_id = p.id
    ${whereClause}
    ORDER BY ic.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  const countQuery = `SELECT COUNT(*) FROM categories ic ${whereClause};`;
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

const getSingleCategory = async (id: number): Promise<ICategory | null> => {
  const query = `
    SELECT 
      ic.*,
      row_to_json(p) as parent_category
    FROM categories ic
    LEFT JOIN categories p ON ic.parent_id = p.id
    WHERE ic.id = $1;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Item category not found');
  }

  return result.rows[0];
};

const updateCategory = async (
  id: number,
  data: Partial<ICategory>
): Promise<ICategory | null> => {
  try {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    const values = [...fields.map(field => (data as any)[field]), id];

    const query = `
      UPDATE categories
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Item category not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update item category');
  }
};

const deleteCategory = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Item category not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete item category');
  }
};

export const CategoryService = {
  createCategory,
  getAllItemCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
