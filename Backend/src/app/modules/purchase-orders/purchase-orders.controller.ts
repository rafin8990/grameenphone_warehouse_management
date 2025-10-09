import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IPurchaseOrderWithItems } from './purchase-orders.interface';
import { PurchaseOrderService } from './purchase-orders.service';
import { POStatusService } from './po-status.service';

// Create Purchase Order
const createPurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await PurchaseOrderService.createPurchaseOrder(data);
  sendResponse<IPurchaseOrderWithItems>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Purchase order created successfully',
    data: result,
  });
});

// Get All Purchase Orders
const getAllPurchaseOrders = catchAsync(
  async (req: Request, res: Response) => {
    const filters = pick(req.query, [
      'searchTerm',
      'po_number',
      'supplier_name',
      'po_type',
    ]);

    const paginationOptions = pick(req.query, paginationFields);

    const result = await PurchaseOrderService.getAllPurchaseOrders(
      filters,
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

    sendResponse<IPurchaseOrderWithItems[]>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase orders retrieved successfully',
      meta: paginationMeta,
      data: result.data,
    });
  }
);

// Get Single Purchase Order (with items)
const getSinglePurchaseOrder = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await PurchaseOrderService.getSinglePurchaseOrder(
      Number(id)
    );
    sendResponse<IPurchaseOrderWithItems>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Purchase order retrieved successfully',
      data: result,
    });
  }
);

// Update Purchase Order
const updatePurchaseOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await PurchaseOrderService.updatePurchaseOrder(
    Number(id),
    data
  );
  sendResponse<IPurchaseOrderWithItems>(res, {
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
  sendResponse<IPurchaseOrderWithItems>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Purchase order deleted successfully',
    data: null,
  });
});

// Auto-create Purchase Order (with optional auto-generated PO number)
const autoCreatePurchaseOrder = catchAsync(
  async (req: Request, res: Response) => {
    const data = req.body;
    const result = await PurchaseOrderService.autoCreatePurchaseOrder(data);
    sendResponse<IPurchaseOrderWithItems>(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Purchase order auto-generated and created successfully',
      data: result,
    });
  }
);

// Quick Generate Purchase Order (no form needed - uses fixed data)
const quickGeneratePurchaseOrder = catchAsync(
  async (req: Request, res: Response) => {
    const result = await PurchaseOrderService.quickGeneratePurchaseOrder();
    sendResponse<IPurchaseOrderWithItems>(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: `Purchase order ${result?.po_number} generated successfully with ${result?.items?.length || 0} items`,
      data: result,
    });
  }
);

// Check and Update PO Status
const checkPOStatus = catchAsync(async (req: Request, res: Response) => {
  const { po_number } = req.params;
  const result = await POStatusService.checkAndUpdatePOStatus(po_number);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `PO status checked successfully`,
    data: result,
  });
});

// Get PO Status Summary
const getPOStatusSummary = catchAsync(async (req: Request, res: Response) => {
  const { po_number } = req.params;
  const result = await POStatusService.getPOStatusSummary(po_number);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `PO status summary retrieved successfully`,
    data: result,
  });
});

export const PurchaseOrderController = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getSinglePurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  autoCreatePurchaseOrder,
  quickGeneratePurchaseOrder,
  checkPOStatus,
  getPOStatusSummary,
};
