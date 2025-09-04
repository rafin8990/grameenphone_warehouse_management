import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IRequisition, IRequisitionItem, IRequisitionWithItems } from './requisitions.interface';
import { RequisitionService } from './requisitions.service';

// Create Requisition
const createRequisition = catchAsync(async (req: Request, res: Response) => {
  const result = await RequisitionService.createRequisition(req.body);
  sendResponse<IRequisitionWithItems>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition created successfully',
    data: result,
  });
});

// Get All Requisitions
const getAllRequisitions = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pick(req.query, [
    'searchTerm',
    'requisition_number',
    'requester_name',
    'organization_code',
    'status',
    'requirement',
    'created_at_from',
    'created_at_to',
    'updated_at_from',
    'updated_at_to',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await RequisitionService.getAllRequisitions(
    rawFilters,
    paginationOptions
  );
  sendResponse<IRequisitionWithItems[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisitions retrieved successfully',
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

// Get Single Requisition
const getSingleRequisition = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RequisitionService.getSingleRequisition(Number(id));
  sendResponse<IRequisitionWithItems>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition retrieved successfully',
    data: result,
  });
});

// Update Requisition
const updateRequisition = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RequisitionService.updateRequisition(Number(id), req.body);
  sendResponse<IRequisitionWithItems>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition updated successfully',
    data: result,
  });
});

// Delete Requisition
const deleteRequisition = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await RequisitionService.deleteRequisition(Number(id));
  sendResponse<IRequisition>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition deleted successfully',
  });
});

// Add Requisition Item
const addRequisitionItem = catchAsync(async (req: Request, res: Response) => {
  const { requisitionId } = req.params;
  const result = await RequisitionService.addRequisitionItem(Number(requisitionId), req.body);
  sendResponse<IRequisitionItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition item added successfully',
    data: result,
  });
});

// Update Requisition Item
const updateRequisitionItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RequisitionService.updateRequisitionItem(Number(id), req.body);
  sendResponse<IRequisitionItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition item updated successfully',
    data: result,
  });
});

// Delete Requisition Item
const deleteRequisitionItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await RequisitionService.deleteRequisitionItem(Number(id));
  sendResponse<IRequisitionItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition item deleted successfully',
  });
});

// Get Single Requisition Item
const getSingleRequisitionItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RequisitionService.getSingleRequisitionItem(Number(id));
  sendResponse<any>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Requisition item retrieved successfully',
    data: result,
  });
});

export const RequisitionController = {
  createRequisition,
  getAllRequisitions,
  getSingleRequisition,
  updateRequisition,
  deleteRequisition,
  addRequisitionItem,
  updateRequisitionItem,
  deleteRequisitionItem,
  getSingleRequisitionItem,
};
