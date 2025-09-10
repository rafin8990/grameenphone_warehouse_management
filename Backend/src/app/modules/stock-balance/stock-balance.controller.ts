import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IStockBalance, IStockBalanceWithDetails } from './stock-balance.interface';
import { StockBalanceService } from './stock-balance.service';

// Create Stock Balance
const createStockBalance = catchAsync(async (req: Request, res: Response) => {
  const result = await StockBalanceService.createStockBalance(req.body);
  sendResponse<IStockBalance>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock balance created successfully',
    data: result,
  });
});

// Get All Stock Balances
const getAllStockBalances = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pick(req.query, [
    'item_id',
    'location_id',
    'searchTerm',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await StockBalanceService.getAllStockBalances(
    rawFilters,
    paginationOptions
  );
  sendResponse<IStockBalanceWithDetails[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock balances retrieved successfully',
    meta: result.meta ? {
      page: result.meta.page || 1,
      limit: result.meta.limit || 10,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      hasNext: result.meta.hasNext,
      hasPrev: result.meta.hasPrev,
    } : undefined,
    data: result.data,
  });
});

// Get Single Stock Balance
const getSingleStockBalance = catchAsync(async (req: Request, res: Response) => {
  const result = await StockBalanceService.getSingleStockBalance(Number(req.params.id));
  sendResponse<IStockBalanceWithDetails>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock balance retrieved successfully',
    data: result,
  });
});

// Update Stock Balance
const updateStockBalance = catchAsync(async (req: Request, res: Response) => {
  const result = await StockBalanceService.updateStockBalance(
    Number(req.params.id),
    req.body
  );
  sendResponse<IStockBalance>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock balance updated successfully',
    data: result,
  });
});

// Delete Stock Balance
const deleteStockBalance = catchAsync(async (req: Request, res: Response) => {
  await StockBalanceService.deleteStockBalance(Number(req.params.id));
  sendResponse<IStockBalance>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock balance deleted successfully',
  });
});

// Get Stock Balance by Item
const getStockBalanceByItem = catchAsync(async (req: Request, res: Response) => {
  const result = await StockBalanceService.getStockBalanceForItems([Number(req.params.itemId)]);
  sendResponse<IStockBalanceWithDetails[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock balances for item retrieved successfully',
    data: result,
  });
});

// Get Stock Balance by Location
const getStockBalanceByLocation = catchAsync(async (req: Request, res: Response) => {
  const result = await StockBalanceService.getStockBalanceByLocation(Number(req.params.locationId));
  sendResponse<IStockBalanceWithDetails[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock balances for location retrieved successfully',
    data: result,
  });
});

// Update Stock Balance Quantity
const updateStockBalanceQuantity = catchAsync(async (req: Request, res: Response) => {
  const { item_id, location_id, quantity_change } = req.body;
  const result = await StockBalanceService.updateStockBalance(item_id, location_id, quantity_change);
  sendResponse<IStockBalance>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock balance quantity updated successfully',
    data: result,
  });
});

export const StockBalanceController = {
  createStockBalance,
  getAllStockBalances,
  getSingleStockBalance,
  updateStockBalance,
  deleteStockBalance,
  getStockBalanceByItem,
  getStockBalanceByLocation,
  updateStockBalanceQuantity,
};
