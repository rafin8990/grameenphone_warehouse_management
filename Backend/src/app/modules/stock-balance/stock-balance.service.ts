import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IStockBalance, IStockBalanceWithDetails, IStockBalanceWithLocation, CreateStockBalanceData, UpdateStockBalanceData, StockBalanceQueryParams } from './stock-balance.interface';

// Get stock balance for specific items
const getStockBalanceForItems = async (itemIds: number[]): Promise<IStockBalanceWithDetails[]> => {
  if (itemIds.length === 0) return [];

  const query = `
    SELECT 
      sb.id,
      sb.item_id,
      sb.location_id,
      sb.on_hand_qty,
      sb.created_at,
      sb.updated_at,
      i.id as item_id,
      i.item_code,
      i.item_description,
      l.id as location_id,
      l.sub_inventory_code,
      l.locator_code,
      l.name as location_name
    FROM stock_balances sb
    LEFT JOIN items i ON sb.item_id = i.id
    LEFT JOIN locations l ON sb.location_id = l.id
    WHERE sb.item_id = ANY($1)
    ORDER BY sb.item_id, sb.location_id;
  `;

  const result = await pool.query(query, [itemIds]);
  return result.rows.map(row => ({
    id: row.id,
    item_id: row.item_id,
    location_id: row.location_id,
    on_hand_qty: row.on_hand_qty,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item: {
      id: row.item_id,
      item_code: row.item_code,
      item_description: row.item_description,
    },
    location: {
      id: row.location_id,
      sub_inventory_code: row.sub_inventory_code,
      locator_code: row.locator_code,
      name: row.location_name,
    }
  }));
};

// Get total stock balance for specific items (sum across all locations)
const getTotalStockBalanceForItems = async (itemIds: number[]): Promise<Record<number, number>> => {
  if (itemIds.length === 0) return {};

  const query = `
    SELECT 
      item_id,
      SUM(on_hand_qty) as total_qty
    FROM stock_balances
    WHERE item_id = ANY($1)
    GROUP BY item_id;
  `;

  const result = await pool.query(query, [itemIds]);
  
  return result.rows.reduce((acc, row) => {
    acc[row.item_id] = parseFloat(row.total_qty) || 0;
    return acc;
  }, {} as Record<number, number>);
};

// Get stock balance for a specific item and location
const getStockBalanceForItemLocation = async (itemId: number, locationId: number): Promise<IStockBalance | null> => {
  const query = `
    SELECT * FROM stock_balances
    WHERE item_id = $1 AND location_id = $2;
  `;

  const result = await pool.query(query, [itemId, locationId]);
  return result.rows[0] || null;
};

// Create or update stock balance
const upsertStockBalance = async (data: {
  item_id: number;
  location_id: number;
  on_hand_qty: number;
}): Promise<IStockBalance> => {
  const query = `
    INSERT INTO stock_balances (item_id, location_id, on_hand_qty)
    VALUES ($1, $2, $3)
    ON CONFLICT (item_id, location_id)
    DO UPDATE SET 
      on_hand_qty = EXCLUDED.on_hand_qty,
      updated_at = NOW()
    RETURNING *;
  `;

  const result = await pool.query(query, [data.item_id, data.location_id, data.on_hand_qty]);
  return result.rows[0];
};

// Update stock balance (add or subtract quantity)
const updateStockBalance = async (data: {
  item_id: number;
  location_id: number;
  quantity_change: number;
}): Promise<IStockBalance> => {
  const query = `
    INSERT INTO stock_balances (item_id, location_id, on_hand_qty)
    VALUES ($1, $2, $3)
    ON CONFLICT (item_id, location_id)
    DO UPDATE SET 
      on_hand_qty = stock_balances.on_hand_qty + EXCLUDED.on_hand_qty,
      updated_at = NOW()
    RETURNING *;
  `;

  const result = await pool.query(query, [data.item_id, data.location_id, data.quantity_change]);
  return result.rows[0];
};

// Create Stock Balance
const createStockBalance = async (data: CreateStockBalanceData): Promise<IStockBalance> => {
  const query = `
    INSERT INTO stock_balances (item_id, location_id, on_hand_qty)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  
  const result = await pool.query(query, [data.item_id, data.location_id, data.on_hand_qty]);
  return result.rows[0];
};

// Get All Stock Balances with pagination and filtering
const getAllStockBalances = async (
  filters: StockBalanceQueryParams,
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IStockBalanceWithDetails[]>> => {
  const { 
    item_id, 
    location_id, 
    searchTerm,
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

  if (item_id) {
    conditions.push(`sb.item_id = $${paramIndex}`);
    values.push(item_id);
    paramIndex++;
  }

  if (location_id) {
    conditions.push(`sb.location_id = $${paramIndex}`);
    values.push(location_id);
    paramIndex++;
  }

  if (searchTerm) {
    conditions.push(`(i.item_code ILIKE $${paramIndex} OR i.item_description ILIKE $${paramIndex} OR l.sub_inventory_code ILIKE $${paramIndex} OR l.locator_code ILIKE $${paramIndex})`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`sb.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      sb.id,
      sb.item_id,
      sb.location_id,
      sb.on_hand_qty,
      sb.created_at,
      sb.updated_at,
      i.id as item_id,
      i.item_code,
      i.item_description,
      l.id as location_id,
      l.sub_inventory_code,
      l.locator_code,
      l.name as location_name
    FROM stock_balances sb
    LEFT JOIN items i ON sb.item_id = i.id
    LEFT JOIN locations l ON sb.location_id = l.id
    ${whereClause}
    ORDER BY sb.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  const stockBalances: IStockBalanceWithDetails[] = result.rows.map(row => ({
    id: row.id,
    item_id: row.item_id,
    location_id: row.location_id,
    on_hand_qty: row.on_hand_qty,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item: {
      id: row.item_id,
      item_code: row.item_code,
      item_description: row.item_description,
    },
    location: {
      id: row.location_id,
      sub_inventory_code: row.sub_inventory_code,
      locator_code: row.locator_code,
      name: row.location_name,
    }
  }));

  const countQuery = `SELECT COUNT(*) FROM stock_balances sb LEFT JOIN items i ON sb.item_id = i.id LEFT JOIN locations l ON sb.location_id = l.id ${whereClause};`;
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
    data: stockBalances,
  };
};

// Get Single Stock Balance
const getSingleStockBalance = async (id: number): Promise<IStockBalanceWithDetails | null> => {
  const query = `
    SELECT 
      sb.id,
      sb.item_id,
      sb.location_id,
      sb.on_hand_qty,
      sb.created_at,
      sb.updated_at,
      i.id as item_id,
      i.item_code,
      i.item_description,
      l.id as location_id,
      l.sub_inventory_code,
      l.locator_code,
      l.name as location_name
    FROM stock_balances sb
    LEFT JOIN items i ON sb.item_id = i.id
    LEFT JOIN locations l ON sb.location_id = l.id
    WHERE sb.id = $1;
  `;

  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    item_id: row.item_id,
    location_id: row.location_id,
    on_hand_qty: row.on_hand_qty,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item: {
      id: row.item_id,
      item_code: row.item_code,
      item_description: row.item_description,
    },
    location: {
      id: row.location_id,
      sub_inventory_code: row.sub_inventory_code,
      locator_code: row.locator_code,
      name: row.location_name,
    }
  };
};

// Update Stock Balance
const updateStockBalanceById = async (id: number, data: UpdateStockBalanceData): Promise<IStockBalance> => {
  const query = `
    UPDATE stock_balances 
    SET on_hand_qty = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [data.on_hand_qty, id]);
  
  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock balance not found');
  }
  
  return result.rows[0];
};

// Delete Stock Balance
const deleteStockBalance = async (id: number): Promise<void> => {
  const query = `DELETE FROM stock_balances WHERE id = $1;`;
  const result = await pool.query(query, [id]);
  
  if (result.rowCount === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Stock balance not found');
  }
};

// Get Stock Balance by Location
const getStockBalanceByLocation = async (locationId: number): Promise<IStockBalanceWithDetails[]> => {
  const query = `
    SELECT 
      sb.id,
      sb.item_id,
      sb.location_id,
      sb.on_hand_qty,
      sb.created_at,
      sb.updated_at,
      i.id as item_id,
      i.item_code,
      i.item_description,
      l.id as location_id,
      l.sub_inventory_code,
      l.locator_code,
      l.name as location_name
    FROM stock_balances sb
    LEFT JOIN items i ON sb.item_id = i.id
    LEFT JOIN locations l ON sb.location_id = l.id
    WHERE sb.location_id = $1
    ORDER BY sb.created_at DESC;
  `;

  const result = await pool.query(query, [locationId]);
  
  return result.rows.map(row => ({
    id: row.id,
    item_id: row.item_id,
    location_id: row.location_id,
    on_hand_qty: row.on_hand_qty,
    created_at: row.created_at,
    updated_at: row.updated_at,
    item: {
      id: row.item_id,
      item_code: row.item_code,
      item_description: row.item_description,
    },
    location: {
      id: row.location_id,
      sub_inventory_code: row.sub_inventory_code,
      locator_code: row.locator_code,
      name: row.location_name,
    }
  }));
};

export const StockBalanceService = {
  createStockBalance,
  getAllStockBalances,
  getSingleStockBalance,
  updateStockBalance: updateStockBalanceById,
  deleteStockBalance,
  getStockBalanceForItems,
  getTotalStockBalanceForItems,
  getStockBalanceForItemLocation,
  getStockBalanceByLocation,
  upsertStockBalance,
};
