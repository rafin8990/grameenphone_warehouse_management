import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IInbound, IInboundFilters, IRfidScanData } from './inbound.interface';
import { DashboardService } from '../dashboard/dashboard.service';
import { StockService } from '../stock/stock.service';
import inboundRedis from '../../../services/inboundRedis';
import { getBangladeshTimeISO } from '../../../shared/timezone';

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

    // Will acquire advisory lock after resolving po_number from EPC

    console.log('📡 Processing RFID scan:', scanData);

    // Step 1: Parse user_id from value field
    const user_id = Number(scanData.value);
    if (!user_id) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'User ID (value) is required in the payload'
      );
    }

    // Step 2: Get EPC details from po_hex_codes table
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

    // Acquire advisory lock per PO to serialize concurrent scans for same PO
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [po_number]);

    // Step 3: Get purchase order details
    const poQuery = `
      SELECT 
        po.po_number, 
        po.po_description as description, 
        po.supplier_name, 
        po.po_type as status,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_number', poi.item_number,
              'quantity', poi.quantity,
              'created_at', poi.created_at
            )
          ) FILTER (WHERE poi.id IS NOT NULL),
          '[]'::json
        ) as po_items_array
      FROM purchase_orders po
      LEFT JOIN po_items poi ON po.id = poi.po_id
      WHERE po.po_number = $1
      GROUP BY po.id, po.po_number, po.po_description, po.supplier_name, po.po_type;
    `;
    const poResult = await client.query(poQuery, [po_number]);

    if (poResult.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Purchase order "${po_number}" not found`
      );
    }

    const poData = poResult.rows[0];

    // Step 4: Get item details
    const itemQuery = `
      SELECT item_description, primary_uom
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

    const itemData = itemResult.rows[0];

    // Step 5: Get user details (location name)
    const userQuery = `
      SELECT name
      FROM users
      WHERE id = $1;
    `;
    const userResult = await client.query(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `User with ID "${user_id}" not found`
      );
    }

    const userData = userResult.rows[0];
    const location_name = userData.name; // User's name becomes location name

    // Step 6: Proceed without Redis gating; rely on DB JSON checks for duplicates
    let shouldProcessInbound = true;

    // Step 7: Process Inbound JSON via shared manual creator
    let inboundRecord: IInbound | null = null;
    let items: any[] = [];
    if (shouldProcessInbound) {
      const createdRec = await createInboundManual({
        po_number,
        item_number,
        item_description: itemData.item_description,
        lot_no,
        epc: scanData.epc,
        quantity: Number(quantity),
      });
      inboundRecord = createdRec as IInbound;
      const createdItems: any = (createdRec as any)?.items;
      items = Array.isArray(createdItems) ? createdItems : JSON.parse(createdItems as any);
    } 
    // Step 8: Location Tracker Processing (60 second cooldown for same EPC+item_number+user_id)
    let shouldCreateLocationTracker = true;
    let newStatus: 'in' | 'out' = 'in';

    // Check if same EPC+user_id+item_number exists
    const locationTrackerQuery = `
      SELECT id, status, created_at
      FROM location_tracker
      WHERE epc = $1 AND user_id = $2 AND item_number = $3
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const trackerResult = await client.query(locationTrackerQuery, [
      scanData.epc, user_id, item_number
    ]);

    if (trackerResult.rows.length > 0) {
      const lastRecord = trackerResult.rows[0];
      const timeDiff = Date.now() - new Date(lastRecord.created_at).getTime();
      
      if (timeDiff < 60000) { // 60 seconds cooldown
        console.log(`⚠️ Location tracker cooldown active for EPC ${scanData.epc} - ${Math.round((60000 - timeDiff) / 1000)}s remaining`);
        shouldCreateLocationTracker = false;
      } else {
        // Toggle status after 30 seconds
        newStatus = lastRecord.status === 'in' ? 'out' : 'in';
        console.log(`🔄 Location tracker status toggle: ${lastRecord.status} → ${newStatus}`);
      }
    } else {
      console.log(`📍 First time location tracking for EPC ${scanData.epc} - status: in`);
    }

    // Insert location tracker record
    let trackerInsertResult = null;
    if (shouldCreateLocationTracker) {
      const insertTrackerQuery = `
        INSERT INTO location_tracker (epc, user_id, po_number, item_number, quantity, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
        RETURNING *;
      `;
      trackerInsertResult = await client.query(insertTrackerQuery, [
        scanData.epc, 
        user_id, 
        po_number, 
        item_number, 
        Number(quantity), 
        newStatus,
        getBangladeshTimeISO()
      ]);
      
      console.log(`📊 Location tracker created: status=${newStatus}, location=${location_name}, EPC=${scanData.epc}, User=${user_id}`);
    } else {
      console.log(`⏳ Location tracker skipped due to 30s cooldown for EPC+user+PO+qty: ${scanData.epc}+${user_id}+${po_number}+${quantity}`);
    }

    // Step 9: Stock Processing
    const stockQuery = `
      SELECT id, quantity
      FROM stocks
      WHERE epc = $1 AND item_number = $2 AND lot_no = $3;
    `;
    const stockResult = await client.query(stockQuery, [scanData.epc, item_number, lot_no]);

    if (stockResult.rows.length > 0) {
      // Same EPC+item+lot already exists → guard with Redis and ignore repeats
      if (await inboundRedis.checkConnection()) {
        const isStockProcessed = await inboundRedis.checkDuplicate(scanData.epc, item_number, po_number);
        if (isStockProcessed) {
          console.log(`⚠️ Stock duplicate ignored via Redis: same EPC+item+lot combination`);
        } else {
          await inboundRedis.setDuplicateCheck(scanData.epc, item_number, po_number);
          console.log(`✅ Stock Redis flag set for existing combo: ${scanData.epc}+${item_number}+${lot_no}`);
        }
      }
    } else {
      // Check for different EPC but same item+lot
      const similarStockQuery = `
        SELECT id, quantity
        FROM stocks
        WHERE item_number = $1 AND lot_no = $2 AND epc != $3;
      `;
      const similarStockResult = await client.query(similarStockQuery, [item_number, lot_no, scanData.epc]);

      if (similarStockResult.rows.length > 0) {
        // Different EPC, same item+lot - add quantity ONCE per EPC using Redis guard
        if (await inboundRedis.checkConnection()) {
          const isStockProcessed = await inboundRedis.checkDuplicate(scanData.epc, item_number, po_number);
          if (isStockProcessed) {
            console.log(`⚠️ Stock add ignored (already added for this EPC+item+PO)`);
          } else {
            await inboundRedis.setDuplicateCheck(scanData.epc, item_number, po_number);
            const stockId = similarStockResult.rows[0].id;
            const currentQuantity = similarStockResult.rows[0].quantity;
            const newQuantity = currentQuantity + Number(quantity);

            const updateStockQuery = `
              UPDATE stocks
              SET quantity = $1, updated_at = $3
              WHERE id = $2
              RETURNING *;
            `;
            await client.query(updateStockQuery, [newQuantity, stockId, getBangladeshTimeISO()]);
            console.log(`📈 Stock quantity updated once-per-EPC: ${currentQuantity} → ${newQuantity} for ${item_number} (${lot_no})`);
          }
        } else {
          const stockId = similarStockResult.rows[0].id;
          const currentQuantity = similarStockResult.rows[0].quantity;
          const newQuantity = currentQuantity + Number(quantity);

          const updateStockQuery = `
            UPDATE stocks
            SET quantity = $1, updated_at = $3
            WHERE id = $2
            RETURNING *;
          `;
          await client.query(updateStockQuery, [newQuantity, stockId, getBangladeshTimeISO()]);
          console.log(`📈 Stock quantity updated (no Redis): ${currentQuantity} → ${newQuantity} for ${item_number} (${lot_no})`);
        }
      } else {
        // New stock record for this EPC; guard against rapid duplicate scans before row appears
        let allowInsert = true;
        if (await inboundRedis.checkConnection()) {
          const isStockProcessed = await inboundRedis.checkDuplicate(scanData.epc, item_number, po_number);
          if (isStockProcessed) {
            allowInsert = false;
            console.log(`⚠️ Stock insert ignored (duplicate EPC+item+PO)`);
          } else {
            await inboundRedis.setDuplicateCheck(scanData.epc, item_number, po_number);
          }
        }
        if (allowInsert) {
          const insertStockQuery = `
            INSERT INTO stocks (epc, po_number, item_number, lot_no, quantity, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
          `;
          await client.query(insertStockQuery, [
            scanData.epc, po_number, item_number, lot_no, Number(quantity), getBangladeshTimeISO(), getBangladeshTimeISO()
          ]);
          console.log(`✨ New stock record created: ${item_number} (${lot_no})`);
        }
      }
    }

    await client.query('COMMIT');

    // Step 10: Emit socket events for live dashboard
    try {
      const io = getSocketInstance();
      if (io) {
        // Get all items from the most up-to-date inbound record
        const allItems = inboundRecord && inboundRecord.items ? inboundRecord.items : items;
        
        // Compute aggregated received quantity across ALL entries for this item_number
        const aggregatedReceivedForItem = allItems
          .filter((it: any) => it.item_number === item_number)
          .reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0);

        // Get ordered quantity from PO
        const orderedQuantity = poData.po_items_array?.find((item: any) => item.item_number === item_number)?.quantity || 0;
        
        // Calculate remaining quantity
        const resolvedOrderedQty = Number(orderedQuantity);
        const resolvedReceivedQty = Number(aggregatedReceivedForItem);
        const resolvedRemainingQty = resolvedOrderedQty - resolvedReceivedQty;

        console.log(`📊 Socket aggregation for ${item_number}:`, {
          total_entries: allItems.filter((it: any) => it.item_number === item_number).length,
          individual_quantities: allItems.filter((it: any) => it.item_number === item_number).map((it: any) => ({ epc: it.epc, qty: it.quantity })),
          aggregated_received: resolvedReceivedQty,
          ordered: resolvedOrderedQty,
          remaining: resolvedRemainingQty
        });

        // Inbound scan event
        io.emit('inbound:new-scan', {
          po_number,
          item_number,
          item_description: itemData.item_description,
          received_quantity: resolvedReceivedQty,
          scanned_quantity: Number(quantity),
          ordered_quantity: resolvedOrderedQty,
          remaining_quantity: resolvedRemainingQty,
          lot_no,
          timestamp: getBangladeshTimeISO(),
          epc: scanData.epc,
          location_name,
          location_status: newStatus,
          user_id
        });

        // Location tracker event (only if tracker was created)
        if (trackerInsertResult && trackerInsertResult.rows.length > 0) {
          io.emit('location-tracker:new-activity', {
            id: trackerInsertResult.rows[0].id,
            epc: scanData.epc,
            user_id,
            po_number,
            item_number,
            quantity: Number(quantity),
            received_quantity: resolvedReceivedQty,
            ordered_quantity: resolvedOrderedQty,
            remaining_quantity: resolvedRemainingQty,
            status: newStatus,
            location_name,
            created_at: trackerInsertResult.rows[0].created_at,
            timestamp: getBangladeshTimeISO()
          });
        }

        console.log(`✅ Socket events emitted for ${po_number} - Item: ${item_number}, Status: ${newStatus}, Location: ${location_name}`);
        console.log(`📊 Socket data: received_quantity=${resolvedReceivedQty}, scanned_quantity=${Number(quantity)}, ordered_quantity=${resolvedOrderedQty}`);
      }
    } catch (socketError) {
      console.error('Socket emit error (non-critical):', socketError);
    }

    return inboundRecord || null;
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;

    console.error('Inbound processing error:', error);

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

// Unified live data endpoint for dashboard (single source of truth)
const getUnifiedLiveData = async () => {
  try {
    // Reuse existing services to aggregate consistent live data
    const dashboardStats = await DashboardService.getDashboardStats();
    const stockLive = await StockService.getLiveStockData();

    return {
      dashboard: dashboardStats,
      stock: stockLive,
      last_updated: getBangladeshTimeISO(),
    };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to get unified live data');
  }
};

// Test location tracking
const testLocationTracking = async (data: { location_code: string; po_number: string; item_number: string }) => {
  try {
    // Simple test implementation
    return {
      success: true,
      message: 'Location tracking test completed',
      data: {
        location_code: data.location_code,
        po_number: data.po_number,
        item_number: data.item_number,
        timestamp: getBangladeshTimeISO()
      }
    };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Location tracking test failed');
  }
};


// Manual inbound creator (utility)
const createInboundManual = async (params: {
  po_number: string;
  item_number: string;
  item_description?: string;
  lot_no?: string;
  epc: string;
  quantity: number;
}): Promise<IInbound> => {
  const { po_number, item_number, item_description, lot_no, epc, quantity } = params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure PO exists and fetch ordered qty for item
    const poItemsQuery = `
      SELECT poi.quantity
      FROM purchase_orders po
      LEFT JOIN po_items poi ON po.id = poi.po_id AND poi.item_number = $2
      WHERE po.po_number = $1
      LIMIT 1;
    `;
    const poItemsRes = await client.query(poItemsQuery, [po_number, item_number]);
    const orderedQty = Number(poItemsRes.rows[0]?.quantity || 0);

    // Fetch existing inbound for this PO (after acquiring lock)
    const inboundQuery = `
      SELECT id, items FROM inbound WHERE po_number = $1 ORDER BY created_at DESC LIMIT 1;
    `;
    const inboundRes = await client.query(inboundQuery, [po_number]);

    let inboundRecord: any;
    if (inboundRes.rows.length === 0) {
      // Create new
      const items = [
        {
          item_number,
          item_description: item_description || '',
          quantity: Number(quantity),
          ordered_quantity: orderedQty,
          lot_no: lot_no,
          epc,
        },
      ];
      const insertQuery = `
        INSERT INTO inbound (po_number, items, received_at)
        VALUES ($1, $2, CURRENT_DATE)
        RETURNING *;
      `;
      const insertRes = await client.query(insertQuery, [po_number, JSON.stringify(items)]);
      inboundRecord = insertRes.rows[0];
      inboundRecord.items = items;
    } else {
      // Update existing
      inboundRecord = inboundRes.rows[0];
      let items = Array.isArray(inboundRecord.items)
        ? inboundRecord.items
        : JSON.parse(inboundRecord.items as any);

      if (!Array.isArray(items)) items = [];

      // Ignore if exact EPC+item exists
      const sameEpcItem = items.find(
        (it: any) => it.item_number === item_number && it.epc === epc
      );
      if (sameEpcItem) {
        await client.query('COMMIT');
        return { ...inboundRecord, items } as IInbound;
      }

      // If same item with different EPC exists -> create a separate entry (do NOT sum)
      const sameItemDifferentEpcIdx = items.findIndex(
        (it: any) => it.item_number === item_number && it.epc !== epc
      );
      if (sameItemDifferentEpcIdx !== -1) {
        items.push({
          item_number,
          item_description: item_description || '',
          quantity: Number(quantity),
          ordered_quantity: orderedQty,
          lot_no: lot_no,
          epc,
        });
      } else {
        // New object (different item)
        items.push({
          item_number,
          item_description: item_description || '',
          quantity: Number(quantity),
          ordered_quantity: orderedQty,
          lot_no: lot_no,
          epc,
        });
      }

      const updateQuery = `
        UPDATE inbound SET items = $1, updated_at = $3 WHERE id = $2 RETURNING *;
      `;
      const updateRes = await client.query(updateQuery, [JSON.stringify(items), inboundRecord.id, getBangladeshTimeISO()]);
      inboundRecord = updateRes.rows[0];
      inboundRecord.items = items;
    }

    await client.query('COMMIT');
    return inboundRecord as IInbound;
  } catch (e) {
    await client.query('ROLLBACK');
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create inbound manually');
  } finally {
    client.release();
  }
};

export const InboundService = {
  processRfidScan,
  getAllInbounds,
  getSingleInbound,
  updateInbound,
  deleteInbound,
  getUnifiedLiveData,
  testLocationTracking,
  createInboundManual
};

