import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { ICategory } from './categories.interface';
import { CategoryService } from './categories.service';


// Create Item Category
const createItemCategory = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await CategoryService.createCategory(data);
  sendResponse<ICategory>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Item category created successfully',
    data: result,
  });
});

// Get All Item Categories
const getAllItemCategories = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pick(req.query, [
    'searchTerm',
    'code',
    'name',
    'parent_id',
    'status',
    'fusion_category_code',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await CategoryService.getAllItemCategories(
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

  sendResponse<ICategory[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item categories retrieved successfully',
    meta: paginationMeta,
    data: result.data,
  });
});

// Get Single Item Category
const getSingleItemCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.getSingleCategory(Number(id));
  sendResponse<ICategory>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item category retrieved successfully',
    data: result,
  });
});

// Update Item Category
const updateItemCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await CategoryService.updateCategory(Number(id), data);
  sendResponse<ICategory>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item category updated successfully',
    data: result,
  });
});

// Delete Item Category
const deleteItemCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await CategoryService.deleteCategory(Number(id));
  sendResponse<ICategory>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Item category deleted successfully',
    data: null,
  });
});

export const ItemCategoryController = {
  createItemCategory,
  getAllItemCategories,
  getSingleItemCategory,
  updateItemCategory,
  deleteItemCategory,
};
