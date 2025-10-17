import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IEpcTracking, IEpcTrackingFilters } from './epc-tracking.interface';
import { getBangladeshTimeISO } from '../../../shared/timezone';

// Check if EPC+item+PO combination has been processed before
const isEpcProcessed = async (epc: string, item_number: string, po_number: string): Promise<boolean> => {
  const query = `
    SELECT id FROM epc_tracking 
    WHERE epc = $1 AND item_number = $2 AND po_number = $3;
  `;
  const result = await pool.query(query, [epc, item_number, po_number]);
  return result.rows.length > 0;
};

// Record EPC processing to prevent duplicates
const recordEpcProcessing = async (epc: string, item_number: string, po_number: string, quantity: number): Promise<IEpcTracking> => {
  const query = `
    INSERT INTO epc_tracking (epc, item_number, po_number, quantity, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (epc, item_number, po_number) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      updated_at = EXCLUDED.updated_at
    RETURNING *;
  `;
  const result = await pool.query(query, [epc, item_number, po_number, quantity, getBangladeshTimeISO(), getBangladeshTimeISO()]);
  return result.rows[0];
};

// Get all EPC tracking records
const getAllEpcTracking = async (filters: IEpcTrackingFilters = {}): Promise<IEpcTracking[]> => {
  const { epc, item_number, po_number } = filters;
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (epc) {
    conditions.push(`epc = $${paramIndex}`);
    values.push(epc);
    paramIndex++;
  }

  if (item_number) {
    conditions.push(`item_number = $${paramIndex}`);
    values.push(item_number);
    paramIndex++;
  }

  if (po_number) {
    conditions.push(`po_number = $${paramIndex}`);
    values.push(po_number);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT * FROM epc_tracking
    ${whereClause}
    ORDER BY created_at DESC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

// Get EPC tracking statistics
const getEpcTrackingStats = async () => {
  const query = `
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT epc) as unique_epcs,
      COUNT(DISTINCT item_number) as unique_items,
      COUNT(DISTINCT po_number) as unique_pos,
      SUM(quantity) as total_quantity
    FROM epc_tracking;
  `;
  const result = await pool.query(query);
  return result.rows[0];
};

export const EpcTrackingService = {
  isEpcProcessed,
  recordEpcProcessing,
  getAllEpcTracking,
  getEpcTrackingStats,
};
