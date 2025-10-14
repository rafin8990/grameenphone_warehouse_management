import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { InboundService } from './inbound.service';
import { IInbound } from './inbound.interface';
import { paginationFields } from '../../../constants/pagination';
import pick from '../../../shared/pick';
import { IGenericResponse } from '../../../interfaces/common';
import pool from '../../../utils/dbClient';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

// Process RFID scan
const processRfidScan = catchAsync(async (req: Request, res: Response) => {
  const scanData = req.body;
  const result = await InboundService.processRfidScan(scanData);
  
  sendResponse<IInbound>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'RFID scan processed successfully',
    data: result,
  });
});

// Get all inbounds with filters and pagination
const getAllInbounds = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ['po_number', 'item_number', 'location_code', 'status']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await InboundService.getAllInbounds(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbounds retrieved successfully',
    meta: result.meta ? {
      page: result.meta.page ?? 1,
      limit: result.meta.limit ?? 10,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      hasNext: result.meta.hasNext,
      hasPrev: result.meta.hasPrev,
    } : undefined,
    data: result.data,
  });
});

// Get Single Inbound
const getSingleInbound = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await InboundService.getSingleInbound(Number(id));
  
  sendResponse<IInbound>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbound retrieved successfully',
    data: result,
  });
});

// Update Inbound
const updateInbound = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await InboundService.updateInbound(Number(id), data);
  
  sendResponse<IInbound>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbound updated successfully',
    data: result,
  });
});

// Delete Inbound
const deleteInbound = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await InboundService.deleteInbound(Number(id));
  
  sendResponse<IInbound>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbound deleted successfully',
    data: null,
  });
});

// Simple live data endpoint that works
const getUnifiedLiveData = catchAsync(async (req: Request, res: Response) => {
  try {
    // Get basic counts from existing tables
    const locationsResult = await pool.query('SELECT COUNT(*) as count FROM locations');
    const itemsResult = await pool.query('SELECT COUNT(*) as count FROM items');
    const purchaseOrdersResult = await pool.query('SELECT COUNT(*) as count FROM purchase_orders');
    const stocksResult = await pool.query('SELECT COUNT(*) as count FROM stocks');

    // Get pending purchase orders
    let pendingPurchaseOrders = 0;
    try {
      const pendingResult = await pool.query('SELECT COUNT(*) as count FROM purchase_orders WHERE status = $1', ['pending']);
      pendingPurchaseOrders = parseInt(pendingResult.rows[0].count, 10);
    } catch (error: any) {
      console.log('Pending purchase orders query failed:', error.message);
    }

    // Get stock quantity
    let totalStockQuantity = 0;
    try {
      const quantityResult = await pool.query('SELECT SUM(quantity) as total_quantity FROM stocks');
      totalStockQuantity = parseInt(quantityResult.rows[0].total_quantity || 0, 10);
    } catch (error: any) {
      console.log('Stock quantity query failed:', error.message);
    }

    const dashboardStats = {
      totalLocations: parseInt(locationsResult.rows[0].count, 10),
      totalAvailableRfid: 0, // Table doesn't exist
      totalVendors: 0, // Table doesn't exist
      totalItems: parseInt(itemsResult.rows[0].count, 10),
      totalAvailableRequisitions: 0, // Table doesn't exist
      totalPurchaseOrders: parseInt(purchaseOrdersResult.rows[0].count, 10),
      pendingPurchaseOrders,
      totalStockItems: parseInt(stocksResult.rows[0].count, 10),
      totalStockQuantity,
    };

    const result = {
      dashboard: dashboardStats,
      stock: {
        stats: {
          total_items: dashboardStats.totalStockItems,
          total_quantity: dashboardStats.totalStockQuantity,
          unique_items: 0,
          unique_pos: 0,
          recent_updates: 0,
        },
        summary: [],
        last_updated: new Date().toISOString()
      },
      last_updated: new Date().toISOString(),
    };

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Unified live data retrieved successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getUnifiedLiveData:', error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'Failed to get unified live data',
      data: null,
    });
  }
});

// Test location tracking endpoint
const testLocationTracking = catchAsync(async (req: Request, res: Response) => {
  const { location_code, po_number, item_number } = req.body;
  
  try {
    // Simulate location tracking logic
    const result = await InboundService.testLocationTracking({
      location_code,
      po_number,
      item_number,
    });
    
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Location tracking test completed',
      data: result,
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'Location tracking test failed',
      data: { error: error.message },
    });
  }
});

export const InboundController = {
  processRfidScan,
  getAllInbounds,
  getSingleInbound,
  updateInbound,
  deleteInbound,
  getUnifiedLiveData,
  testLocationTracking,
};