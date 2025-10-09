import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IInbound } from './inbound.interface';
import { InboundService } from './inbound.service';

// Process RFID Scan
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

// Get All Inbounds
const getAllInbounds = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'po_number',
    'received_at',
  ]);

  const paginationOptions = pick(req.query, paginationFields);

  const result = await InboundService.getAllInbounds(filters, paginationOptions);

  const paginationMeta = result.meta
    ? {
        page: result.meta.page ?? 1,
        limit: result.meta.limit ?? 10,
        total: result.meta.total ?? 0,
        ...paginationHelpers.calculatePaginationMetadata(
          result.meta.page ?? 1,
          result.meta.limit ?? 10,
          result.meta.total ?? 0
        ),
      }
    : undefined;

  sendResponse<IInbound[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Inbounds retrieved successfully',
    meta: paginationMeta,
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

// Unified live data endpoint
const getUnifiedLiveData = catchAsync(async (req: Request, res: Response) => {
  const result = await InboundService.getUnifiedLiveData();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unified live data retrieved successfully',
    data: result,
  });
});

export const InboundController = {
  processRfidScan,
  getAllInbounds,
  getSingleInbound,
  updateInbound,
  deleteInbound,
  getUnifiedLiveData,
};

