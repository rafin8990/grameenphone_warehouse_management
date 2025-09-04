import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IPurchaseOrder, IPurchaseOrderComplete } from './purchase-orders.interface';
import { PurchaseOrderService } from './purchase-orders.service';

// Create Purchase Order
const createPurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await PurchaseOrderService.createPurchaseOrder(data);
  sendResponse<IPurchaseOrderComplete>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Purchase order created successfully',
    data: result,
  });
});

// Get All Purchase Orders
const getAllPurchaseOrders = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pick(req.query, [
    'searchTerm',
    'po_number',
    'vendor_id',
    'status',
    'requisition_id',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await PurchaseOrderService.getAllPurchaseOrders(
    rawFilters,
    paginationOptions
  );

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

  sendResponse<IPurchaseOrderComplete[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase orders retrieved successfully',
    meta: paginationMeta,
    data: result.data,
  });
});

// Get Single Purchase Order (with items and RFID)
const getSinglePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PurchaseOrderService.getSinglePurchaseOrder(Number(id));
  sendResponse<IPurchaseOrderComplete>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase order with items and RFID retrieved successfully',
    data: result,
  });
});

// Update Purchase Order
const updatePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await PurchaseOrderService.updatePurchaseOrder(Number(id), data);
  sendResponse<IPurchaseOrderComplete>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase order updated successfully',
    data: result,
  });
});

// Delete Purchase Order
const deletePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await PurchaseOrderService.deletePurchaseOrder(Number(id));
  sendResponse<IPurchaseOrder>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase order deleted successfully',
    data: null,
  });
});

export const PurchaseOrderController = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getSinglePurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
};
