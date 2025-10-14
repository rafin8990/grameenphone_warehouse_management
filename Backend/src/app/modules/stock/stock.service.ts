import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import pool from '../../../utils/dbClient';
import { IStock, IStockFilters, IStockUpdate, IStockStats, IStockSummary } from './stock.interface';

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

// Update or create stock record
const updateStock = async (stockData: IStockUpdate): Promise<IStock> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('📦 Updating stock:', stockData);

    let stockRecord: IStock;

    if (stockData.epc) {
      // EPC-based stock update logic
      // Check if exact combination exists (po_number, lot_no, item_number, epc)
      const exactMatchQuery = `
        SELECT id, quantity 
        FROM stocks 
        WHERE po_number = $1 AND item_number = $2 AND lot_no = $3 AND epc = $4;
      `;
      const exactMatchResult = await client.query(exactMatchQuery, [
        stockData.po_number,
        stockData.item_number,
        stockData.lot_no,
        stockData.epc
      ]);

      if (exactMatchResult.rows.length > 0) {
        // Same EPC exists - quantity remains unchanged
        stockRecord = exactMatchResult.rows[0];
        console.log(`🔄 Same EPC exists - quantity unchanged: ${stockData.item_number} (${stockData.lot_no}) EPC: ${stockData.epc} - ${stockRecord.quantity}`);
      } else {
        // Different EPC - check if same po_number, lot_no, item_number exists
        const sameItemQuery = `
          SELECT id, quantity 
          FROM stocks 
          WHERE po_number = $1 AND item_number = $2 AND lot_no = $3;
        `;
        const sameItemResult = await client.query(sameItemQuery, [
          stockData.po_number,
          stockData.item_number,
          stockData.lot_no
        ]);

        if (sameItemResult.rows.length > 0) {
          // Same item exists with different EPC - add to existing quantity
          const existing = sameItemResult.rows[0];
          const newQuantity = existing.quantity + stockData.quantity;

          const updateQuery = `
            UPDATE stocks 
            SET quantity = $1, epc = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *;
          `;
          
          const updateResult = await client.query(updateQuery, [newQuantity, stockData.epc, existing.id]);
          stockRecord = updateResult.rows[0];
          
          console.log(`📈 Stock updated (different EPC): ${stockData.item_number} (${stockData.lot_no}) - ${existing.quantity} → ${newQuantity} EPC: ${stockData.epc}`);
        } else {
          // Completely new item - create new record
          const insertQuery = `
            INSERT INTO stocks (po_number, item_number, lot_no, quantity, epc)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
          `;
          
          const insertResult = await client.query(insertQuery, [
            stockData.po_number,
            stockData.item_number,
            stockData.lot_no,
            stockData.quantity,
            stockData.epc
          ]);
          
          stockRecord = insertResult.rows[0];
          console.log(`✨ New stock record created: ${stockData.item_number} (${stockData.lot_no}) - ${stockData.quantity} EPC: ${stockData.epc}`);
        }
      }
    } else {
      // Legacy logic for non-EPC updates
      const existingQuery = `
        SELECT id, quantity 
        FROM stocks 
        WHERE po_number = $1 AND item_number = $2 AND lot_no = $3;
      `;
      const existingResult = await client.query(existingQuery, [
        stockData.po_number,
        stockData.item_number,
        stockData.lot_no
      ]);

      if (existingResult.rows.length > 0) {
        // Update existing record - add to quantity
        const existing = existingResult.rows[0];
        const newQuantity = existing.quantity + stockData.quantity;

        const updateQuery = `
          UPDATE stocks 
          SET quantity = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *;
        `;
        
        const updateResult = await client.query(updateQuery, [newQuantity, existing.id]);
        stockRecord = updateResult.rows[0];
        
        console.log(`📈 Stock updated (legacy): ${stockData.item_number} (${stockData.lot_no}) - ${existing.quantity} → ${newQuantity}`);
      } else {
        // Create new record
        const insertQuery = `
          INSERT INTO stocks (po_number, item_number, lot_no, quantity)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `;
        
        const insertResult = await client.query(insertQuery, [
          stockData.po_number,
          stockData.item_number,
          stockData.lot_no,
          stockData.quantity
        ]);
        
        stockRecord = insertResult.rows[0];
        console.log(`✨ New stock record created (legacy): ${stockData.item_number} (${stockData.lot_no}) - ${stockData.quantity}`);
      }
    }

    await client.query('COMMIT');

    // Emit live stock update
    try {
      const io = getSocketInstance();
      if (io) {
        io.emit('stock:updated', {
          id: stockRecord.id,
          po_number: stockRecord.po_number,
          item_number: stockRecord.item_number,
          lot_no: stockRecord.lot_no,
          quantity: stockRecord.quantity,
          epc: stockRecord.epc,
          updated_at: stockRecord.updated_at,
          timestamp: new Date().toISOString()
        });
        console.log(`📡 Live stock update emitted for ${stockRecord.item_number}`);
      }
    } catch (socketError) {
      console.error('Socket emit error (non-critical):', socketError);
    }

    return stockRecord;
  } catch (error: any) {
    await client.query('ROLLBACK');
    
    if (error instanceof ApiError) throw error;
    
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to update stock'
    );
  } finally {
    client.release();
  }
};

// Get all stocks with filters
const getAllStocks = async (filters: IStockFilters = {}): Promise<IStock[]> => {
  const { searchTerm, ...filterFields } = filters;

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Search term - searches across multiple fields
  if (searchTerm) {
    conditions.push(
      `(s.po_number ILIKE $${paramIndex} OR s.item_number ILIKE $${paramIndex} OR s.lot_no ILIKE $${paramIndex})`
    );
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Specific field filters
  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`s.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT 
      s.id,
      s.po_number,
      s.item_number,
      s.lot_no,
      s.quantity,
      s.created_at,
      s.updated_at,
      i.item_description,
      po.po_date
    FROM stocks s
    LEFT JOIN items i ON s.item_number = i.item_number
    LEFT JOIN purchase_orders po ON s.po_number = po.po_number
    ${whereClause}
    ORDER BY s.updated_at DESC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

// Get stock statistics
const getStockStats = async (): Promise<IStockStats> => {
  try {
    const totalQuery = 'SELECT COUNT(*) as total FROM stocks';
    const totalResult = await pool.query(totalQuery);
    
    const quantityQuery = 'SELECT SUM(quantity) as total_quantity FROM stocks';
    const quantityResult = await pool.query(quantityQuery);
    
    const uniqueItemsQuery = 'SELECT COUNT(DISTINCT item_number) as unique_items FROM stocks';
    const uniqueItemsResult = await pool.query(uniqueItemsQuery);
    
    const uniquePosQuery = 'SELECT COUNT(DISTINCT po_number) as unique_pos FROM stocks';
    const uniquePosResult = await pool.query(uniquePosQuery);
    
    const recentQuery = `
      SELECT COUNT(*) as recent 
      FROM stocks 
      WHERE updated_at >= CURRENT_DATE - INTERVAL '1 hour'
    `;
    const recentResult = await pool.query(recentQuery);

    return {
      total_items: parseInt(totalResult.rows[0].total, 10),
      total_quantity: parseInt(quantityResult.rows[0].total_quantity || 0, 10),
      unique_items: parseInt(uniqueItemsResult.rows[0].unique_items, 10),
      unique_pos: parseInt(uniquePosResult.rows[0].unique_pos, 10),
      recent_updates: parseInt(recentResult.rows[0].recent, 10),
    };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get stock statistics');
  }
};

// Get stock summary by item
const getStockSummary = async (): Promise<IStockSummary[]> => {
  try {
    console.log('📊 [StockService] Getting stock summary...');
    
    const query = `
      SELECT 
        s.item_number,
        i.item_description,
        SUM(s.quantity) as total_quantity,
        COUNT(DISTINCT s.lot_no) as lot_count,
        COUNT(DISTINCT s.po_number) as po_count,
        MAX(s.updated_at) as last_updated
      FROM stocks s
      LEFT JOIN items i ON s.item_number = i.item_code
      GROUP BY s.item_number, i.item_description
      ORDER BY total_quantity DESC;
    `;
    
    console.log('📊 [StockService] Executing query:', query);
    const result = await pool.query(query);
    console.log('📊 [StockService] Query result:', result.rows.length, 'rows');
    return result.rows;
  } catch (error) {
    console.error('❌ [StockService] Error getting stock summary:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get stock summary');
  }
};

// Get stock by PO, item, and lot
const getStockByPoItemLot = async (
  po_number: string,
  item_number: string,
  lot_no: string
): Promise<IStock | null> => {
  try {
    const query = `
      SELECT 
        s.*,
        i.item_description,
        po.po_date
      FROM stocks s
      LEFT JOIN items i ON s.item_number = i.item_code
      LEFT JOIN purchase_orders po ON s.po_number = po.po_number
      WHERE s.po_number = $1 AND s.item_number = $2 AND s.lot_no = $3;
    `;
    
    const result = await pool.query(query, [po_number, item_number, lot_no]);
    return result.rows[0] || null;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get stock by PO, item, and lot');
  }
};

// Get live stock data for dashboard
const getLiveStockData = async () => {
  try {
    const stats = await getStockStats();
    const summary = await getStockSummary();
    
    return {
      stats,
      summary: summary.slice(0, 10), // Top 10 items
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get live stock data');
  }
};

export const StockService = {
  updateStock,
  getAllStocks,
  getStockStats,
  getStockSummary,
  getStockByPoItemLot,
  getLiveStockData,
};
