import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StockService } from './stock.service';
import { IStockFilters } from './stock.interface';

const getAllStocks = catchAsync(async (req: Request, res: Response) => {
  const filters: IStockFilters = req.query;
  const result = await StockService.getAllStocks(filters);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stocks retrieved successfully',
    data: result,
  });
});

const getStockStats = catchAsync(async (req: Request, res: Response) => {
  const result = await StockService.getStockStats();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock statistics retrieved successfully',
    data: result,
  });
});

const getStockSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await StockService.getStockSummary();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock summary retrieved successfully',
    data: result,
  });
});

const getLiveStockData = catchAsync(async (req: Request, res: Response) => {
  const result = await StockService.getLiveStockData();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Live stock data retrieved successfully',
    data: result,
  });
});

const getStockByPoItemLot = catchAsync(async (req: Request, res: Response) => {
  const { po_number, item_number, lot_no } = req.params;
  const result = await StockService.getStockByPoItemLot(po_number, item_number, lot_no);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Stock retrieved successfully',
    data: result,
  });
});

const getAggregatedStocks = catchAsync(async (req: Request, res: Response) => {
  const result = await StockService.getAggregatedStocks();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Aggregated stocks retrieved successfully',
    data: result,
  });
});

export const StockController = {
  getAllStocks,
  getStockStats,
  getStockSummary,
  getLiveStockData,
  getStockByPoItemLot,
  getAggregatedStocks,
};
