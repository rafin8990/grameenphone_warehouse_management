import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IItem } from './items.interface';
import { ItemService } from './items.service';

// Create Item
const createItem = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await ItemService.createItem(data);
  sendResponse<IItem>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Item created successfully',
    data: result,
  });
});

// Get All Items
const getAllItems = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'item_number',
    'item_description',
    'item_type',
    'inventory_organization',
    'primary_uom',
    'uom_code',
    'item_status',
  ]);
  
  const paginationOptions = pick(req.query, paginationFields);

  const result = await ItemService.getAllItems(filters, paginationOptions);

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

  sendResponse<IItem[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Items retrieved successfully',
    meta: paginationMeta,
    data: result.data,
  });
});

// Get Single Item
const getSingleItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ItemService.getSingleItem(Number(id));
  sendResponse<IItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item retrieved successfully',
    data: result,
  });
});

// Update Item
const updateItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await ItemService.updateItem(Number(id), data);
  sendResponse<IItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item updated successfully',
    data: result,
  });
});

// Delete Item
const deleteItem = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await ItemService.deleteItem(Number(id));
  sendResponse<IItem>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item deleted successfully',
    data: null,
  });
});

export const ItemController = {
  createItem,
  getAllItems,
  getSingleItem,
  updateItem,
  deleteItem,
};
