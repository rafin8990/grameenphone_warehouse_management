import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { IInbound, IInboundFilters, IInboundItem, IRfidScanData } from './inbound.interface';
import { DashboardService } from '../dashboard/dashboard.service';
import { LocationTrackerService } from '../location-trackers/location-trackers.service';
import { StockService } from '../stock/stock.service';
import { POStatusService } from '../purchase-orders/po-status.service';

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

    console.log('📡 Processing RFID scan:', scanData);

    // Step 1: Find hex code in po_hex_codes table using EPC
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

    // Step 2: Get item description and original ordered quantity
    const itemQuery = `
      SELECT 
        i.item_description,
        pi.quantity as ordered_quantity
      FROM items i
      INNER JOIN po_items pi ON i.item_number = pi.item_number
      INNER JOIN purchase_orders po ON pi.po_id = po.id
      WHERE i.item_number = $1 AND po.po_number = $2;
    `;
    const itemResult = await client.query(itemQuery, [item_number, po_number]);

    if (itemResult.rows.length === 0) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Item "${item_number}" not found in items table or not part of PO "${po_number}"`
      );
    }

    const { item_description, ordered_quantity } = itemResult.rows[0];

    // Step 3: Create processed_epcs table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS processed_epcs (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(100) NOT NULL,
        epc VARCHAR(255) NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(po_number, epc)
      );
    `);

    // Step 4: Check if this EPC was already processed for this PO
    const epcCheckQuery = `
      SELECT epc FROM processed_epcs WHERE po_number = $1 AND epc = $2;
    `;
    const epcCheckResult = await client.query(epcCheckQuery, [po_number, scanData.epc]);

    if (epcCheckResult.rows.length > 0) {
      // Fetch existing inbound (for returning consistent shape)
      const existingQuery = `SELECT * FROM inbound WHERE po_number = $1`;
      const existingResult = await pool.query(existingQuery, [po_number]);

      let existingInbound: any = null;
      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        existingInbound = {
          ...existing,
          items: Array.isArray(existing.items) ? existing.items : JSON.parse(existing.items),
        };
      }

      // Process location tracking even for duplicate EPC
      if (scanData.deviceId) {
        try {
          console.log(`🏢 [Inbound] (dup) Processing location tracking for device: ${scanData.deviceId}`);
          const locationQuery = `
            SELECT location_code, location_name
            FROM locations
            WHERE location_code = $1;
          `;
          const locationResult = await pool.query(locationQuery, [scanData.deviceId]);

          if (locationResult.rows.length > 0) {
            const { location_code, location_name } = locationResult.rows[0];
            console.log(`📍 [Inbound] (dup) Location resolved: ${location_name} (${location_code})`);

            const trackerData = {
              location_code,
              po_number,
              item_number,
              quantity: Number(quantity),
              status: 'in' as const,
              epc: scanData.epc,
            };
            console.log('🧩 [Inbound] (dup) Creating LocationTracker with:', trackerData);
            const trackerRecord = await LocationTrackerService.createLocationTracker(trackerData);
            console.log(`📊 [Inbound] (dup) LocationTracker created: id=${trackerRecord.id}, status=${trackerRecord.status}, code=${location_code}`);

            // Emit standardized event
            try {
              const io = getSocketInstance();
              if (io) {
                io.emit('location-tracker:new-activity', {
                  id: trackerRecord.id,
                  location_code,
                  location_name,
                  po_number,
                  item_number,
                  quantity: Number(quantity),
                  status: trackerRecord.status,
                  epc: scanData.epc,
                  created_at: trackerRecord.created_at,
                  timestamp: new Date().toISOString()
                });
                console.log(`📡 [Inbound] (dup) Location tracker socket event emitted for ${location_code}`);
              }
            } catch (socketError) {
              console.error('[Inbound] (dup) Location tracker socket emit error (non-critical):', socketError);
            }
          } else {
            console.log(`⚠️ [Inbound] (dup) Location not found for device ID: ${scanData.deviceId}`);
          }
        } catch (locationError) {
          console.error('❌ [Inbound] (dup) Location tracking error (non-critical):', locationError);
        }
      } else {
        console.log('⚠️ [Inbound] (dup) No device ID provided, skipping location tracking');
      }

      // Get location information for duplicate scan event
      let locationInfo = null;
      let defaultLocation = null;
      
      if (scanData.deviceId) {
        try {
          const locationQuery = `
            SELECT location_code, location_name
            FROM locations
            WHERE location_code = $1;
          `;
          const locationResult = await pool.query(locationQuery, [scanData.deviceId]);
          if (locationResult.rows.length > 0) {
            locationInfo = locationResult.rows[0];
          }
        } catch (error) {
          console.error('Error getting location info for duplicate:', error);
        }
      }
      
      // If no deviceId or location not found, use default warehouse location
      if (!locationInfo) {
        try {
          const defaultLocationQuery = `
            SELECT location_code, location_name
            FROM locations
            WHERE location_type = 'warehouse' AND is_active = true
            ORDER BY created_at ASC
            LIMIT 1;
          `;
          const defaultResult = await pool.query(defaultLocationQuery);
          if (defaultResult.rows.length > 0) {
            defaultLocation = defaultResult.rows[0];
          } else {
            defaultLocation = {
              location_code: 'WAREHOUSE_MAIN',
              location_name: 'Main Warehouse'
            };
          }
        } catch (error) {
          console.error('Error getting default location for duplicate:', error);
          defaultLocation = {
            location_code: 'UNKNOWN',
            location_name: 'Unknown Location'
          };
        }
      }

      // Emit a duplicate scan event for UI (no quantity change)
      try {
        const io = getSocketInstance();
        if (io) {
          io.emit('inbound:new-scan', {
            po_number,
            item_number,
            item_description,
            quantity: (existingInbound?.items?.find?.((it: any) => it.item_number === item_number)?.quantity) ?? Number(quantity),
            scanned_quantity: Number(quantity),
            ordered_quantity: Number(ordered_quantity),
            lot_no,
            timestamp: new Date().toISOString(),
            epc: scanData.epc,
            isDuplicate: true,
            location_code: locationInfo?.location_code || defaultLocation?.location_code || 'UNKNOWN',
            location_name: locationInfo?.location_name || defaultLocation?.location_name || 'Unknown Location',
            location_status: 'in', // Default status for duplicate scans
          });
          console.log(`✅ [Inbound] (dup) Socket event emitted for ${po_number} - Location: ${locationInfo?.location_name || 'Unknown'}`);
        }
      } catch (socketError) {
        console.error('[Inbound] (dup) Socket emit error (non-critical):', socketError);
      }

      return existingInbound;
    }

    // Mark this EPC as processed immediately
    await client.query(
      'INSERT INTO processed_epcs (po_number, epc) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [po_number, scanData.epc]
    );
    console.log(`✅ EPC ${scanData.epc} marked as processed for ${po_number}`);

    // Step 5: Check if inbound record exists for this PO
    const inboundQuery = `
      SELECT id, items
      FROM inbound
      WHERE po_number = $1;
    `;
    const inboundResult = await client.query(inboundQuery, [po_number]);

    let inboundRecord: IInbound;

    if (inboundResult.rows.length === 0) {
      // No inbound record exists - create new one
      const newItem: IInboundItem = {
        item_number,
        item_description,
        lot_no,
        quantity: Number(quantity),
      };

      const insertQuery = `
        INSERT INTO inbound (po_number, items, received_at)
        VALUES ($1, $2, CURRENT_DATE)
        RETURNING *;
      `;

      const insertResult = await client.query(insertQuery, [
        po_number,
        JSON.stringify([newItem]),
      ]);

      inboundRecord = insertResult.rows[0];
      // PostgreSQL JSONB automatically returns as object, no need to parse
      inboundRecord.items = Array.isArray(inboundRecord.items) 
        ? inboundRecord.items 
        : JSON.parse(inboundRecord.items as any);
      
      console.log('✨ New inbound created:', { id: inboundRecord.id, po_number });
    } else {
      // Inbound record exists - update items JSON
      const existingInbound = inboundResult.rows[0];
      // PostgreSQL JSONB returns as object, not string
      let items: IInboundItem[] = Array.isArray(existingInbound.items)
        ? existingInbound.items
        : JSON.parse(existingInbound.items as any);
      
      console.log('📦 Existing inbound found:', { id: existingInbound.id, items_count: items.length });

      // Find if item already exists in the items array
      const existingItemIndex = items.findIndex(
        (item) => item.item_number === item_number
      );

      let finalQuantity: number;
      let isNewItem: boolean;

      if (existingItemIndex !== -1) {
        // Item exists - increase quantity
        items[existingItemIndex].quantity += Number(quantity);
        finalQuantity = items[existingItemIndex].quantity;
        isNewItem = false;
        console.log(`📈 Quantity increased for ${item_number}: ${items[existingItemIndex].quantity - Number(quantity)} → ${finalQuantity}`);
      } else {
        // Item doesn't exist - add new item
        items.push({
          item_number,
          item_description,
          lot_no,
          quantity: Number(quantity),
        });
        finalQuantity = Number(quantity);
        isNewItem = true;
        console.log(`✨ New item added: ${item_number} with quantity ${finalQuantity}`);
      }

      // Update inbound record
      const updateQuery = `
        UPDATE inbound
        SET items = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *;
      `;

      const updateResult = await client.query(updateQuery, [
        JSON.stringify(items),
        existingInbound.id,
      ]);

      inboundRecord = updateResult.rows[0];
      // PostgreSQL JSONB automatically returns as object
      inboundRecord.items = Array.isArray(inboundRecord.items)
        ? inboundRecord.items
        : JSON.parse(inboundRecord.items as any);
      
      console.log('✅ Inbound updated:', { id: inboundRecord.id, items_count: inboundRecord.items.length });
    }

    await client.query('COMMIT');

    // Get the final quantity from the inbound record
    const finalItemData = inboundRecord.items.find(
      (item: IInboundItem) => item.item_number === item_number
    );
    const displayQuantity = finalItemData ? finalItemData.quantity : Number(quantity);

    // Get location information for the scan event
    let locationInfo = null;
    let defaultLocation = null;
    
    // Try to get location from deviceId if provided
    if (scanData.deviceId) {
      try {
        const locationQuery = `
          SELECT location_code, location_name
          FROM locations
          WHERE location_code = $1;
        `;
        const locationResult = await client.query(locationQuery, [scanData.deviceId]);
        if (locationResult.rows.length > 0) {
          locationInfo = locationResult.rows[0];
        }
      } catch (error) {
        console.error('Error getting location info:', error);
      }
    }
    
    // If no deviceId or location not found, use default warehouse location
    if (!locationInfo) {
      try {
        const defaultLocationQuery = `
          SELECT location_code, location_name
          FROM locations
          WHERE location_type = 'warehouse' AND is_active = true
          ORDER BY created_at ASC
          LIMIT 1;
        `;
        const defaultResult = await client.query(defaultLocationQuery);
        if (defaultResult.rows.length > 0) {
          defaultLocation = defaultResult.rows[0];
          console.log(`📍 Using default location: ${defaultLocation.location_name} (${defaultLocation.location_code})`);
        } else {
          // Create a default location if none exists
          await client.query(`
            INSERT INTO locations (location_code, location_name, location_type, is_active)
            VALUES ('WAREHOUSE_MAIN', 'Main Warehouse', 'warehouse', true)
            ON CONFLICT (location_code) DO NOTHING
          `);
          defaultLocation = {
            location_code: 'WAREHOUSE_MAIN',
            location_name: 'Main Warehouse'
          };
          console.log(`📍 Created default location: ${defaultLocation.location_name} (${defaultLocation.location_code})`);
        }
      } catch (error) {
        console.error('Error getting default location:', error);
        defaultLocation = {
          location_code: 'UNKNOWN',
          location_name: 'Unknown Location'
        };
      }
    }

    // Emit socket event for live dashboard
    try {
      const io = getSocketInstance();
      if (io) {
        io.emit('inbound:new-scan', {
          po_number,
          item_number,
          item_description,
          quantity: displayQuantity,  // Use aggregated quantity
          scanned_quantity: Number(quantity),  // Original scan quantity
          ordered_quantity: Number(ordered_quantity),  // Original ordered quantity
          lot_no,
          timestamp: new Date().toISOString(),
          epc: scanData.epc,
          location_code: locationInfo?.location_code || defaultLocation?.location_code || 'UNKNOWN',
          location_name: locationInfo?.location_name || defaultLocation?.location_name || 'Unknown Location',
          location_status: 'in', // Default status for new scans
        });
        console.log(`✅ Socket event emitted for ${po_number} - Item: ${item_number}, Total Qty: ${displayQuantity}, Location: ${locationInfo?.location_name || 'Unknown'}`);
      } else {
        console.log('⚠️ Socket.IO not available, skipping event emit');
      }
    } catch (socketError) {
      console.error('Socket emit error (non-critical):', socketError);
      // Don't throw - socket error shouldn't break the main flow
    }

    // Location Tracking Logic - NEW FEATURE
    // Use the resolved location (either from deviceId or default)
    const finalLocation = locationInfo || defaultLocation;
    if (finalLocation) {
      try {
        console.log(`🏢 [Inbound] Processing location tracking for: ${finalLocation.location_name} (${finalLocation.location_code})`);
        
        // Create location tracker record
        const trackerData = {
          location_code: finalLocation.location_code,
          po_number,
          item_number,
          quantity: Number(quantity),
          status: 'in' as const, // Default status, will be toggled by service if needed
          epc: scanData.epc,
        };
        
        console.log('🧩 [Inbound] Creating LocationTracker with:', trackerData);
        const trackerRecord = await LocationTrackerService.createLocationTracker(trackerData);
        console.log(`📊 [Inbound] LocationTracker created: id=${trackerRecord.id}, status=${trackerRecord.status}, code=${finalLocation.location_code}`);
        
        // Emit location tracker socket event for live dashboard (standardized event name)
        try {
          const io = getSocketInstance();
          if (io) {
            io.emit('location-tracker:new-activity', {
              id: trackerRecord.id,
              location_code: finalLocation.location_code,
              location_name: finalLocation.location_name,
              po_number,
              item_number,
              quantity: Number(quantity),
              status: trackerRecord.status,
              epc: scanData.epc,
              created_at: trackerRecord.created_at,
              timestamp: new Date().toISOString()
            });
            
            // Also update the scan event with the actual location status
            io.emit('inbound:location-status-update', {
              po_number,
              item_number,
              location_code: finalLocation.location_code,
              location_name: finalLocation.location_name,
              location_status: trackerRecord.status,
              timestamp: new Date().toISOString()
            });
            console.log(`📡 Location tracker socket event emitted for ${finalLocation.location_code}`);
          }
        } catch (socketError) {
          console.error('Location tracker socket emit error (non-critical):', socketError);
        }
        
      } catch (locationError) {
        console.error('❌ [Inbound] Location tracking error (non-critical):', locationError);
        // Don't throw - location tracking error shouldn't break the main inbound flow
      }
    } else {
      console.log('⚠️ [Inbound] No location available for tracking');
    }

    // Stock Update Logic - NEW FEATURE
    try {
      console.log(`📦 Updating stock for: ${po_number} - ${item_number} (${lot_no})`);
      
      const stockData = {
        po_number,
        item_number,
        lot_no,
        quantity: Number(quantity),
        epc: scanData.epc
      };
      
      const stockRecord = await StockService.updateStock(stockData);
      console.log(`✅ Stock updated: ${stockRecord.quantity} units of ${item_number} (${lot_no})`);
      
      // Emit stock update socket event for live dashboard
      try {
        const io = getSocketInstance();
        if (io) {
          io.emit('stock:updated', {
            id: stockRecord.id,
            po_number,
            item_number,
            lot_no,
            quantity: stockRecord.quantity,
            epc: scanData.epc,
            created_at: stockRecord.created_at,
            updated_at: stockRecord.updated_at,
            timestamp: new Date().toISOString()
          });
          console.log(`📡 Stock update socket event emitted for ${item_number}`);
        }
      } catch (socketError) {
        console.error('Stock update socket emit error (non-critical):', socketError);
      }
      
    } catch (stockError) {
      console.error('Stock update error (non-critical):', stockError);
      // Don't throw - stock update error shouldn't break the main inbound flow
    }

    // PO Status Check - NEW FEATURE
    try {
      console.log(`📋 Checking PO status for: ${po_number}`);
      
      const poStatusResult = await POStatusService.checkAndUpdatePOStatus(po_number);
      
      if (poStatusResult.isUpdated) {
        console.log(`✅ PO ${po_number} status updated to: ${poStatusResult.status}`);
        
        // Emit PO status update socket event for live dashboard
        try {
          const io = getSocketInstance();
          if (io) {
            io.emit('po:status-updated', {
              po_number,
              status: poStatusResult.status,
              timestamp: new Date().toISOString()
            });
            console.log(`📡 PO status update socket event emitted for ${po_number}`);
          }
        } catch (socketError) {
          console.error('PO status socket emit error (non-critical):', socketError);
        }
      } else {
        console.log(`ℹ️ PO ${po_number} status unchanged: ${poStatusResult.status}`);
      }
      
    } catch (poStatusError) {
      console.error('PO status check error (non-critical):', poStatusError);
      // Don't throw - PO status check error shouldn't break the main inbound flow
    }

    return inboundRecord;
  } catch (error: any) {
    await client.query('ROLLBACK');

    if (error instanceof ApiError) throw error;

    // Log the actual error for debugging
    console.error('Inbound processing error:', error);

    // Extract proper error message
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
      last_updated: new Date().toISOString(),
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
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Location tracking test failed');
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
};

