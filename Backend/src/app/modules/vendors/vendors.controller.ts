import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IVendor, IVendorWithAddresses } from './vendors.interface';
import { VendorService } from './vendors.service';

// Create Vendor
const createVendor = catchAsync(async (req: Request, res: Response) => {
  const result = await VendorService.createVendor(req.body);
  sendResponse<IVendorWithAddresses>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendor created successfully',
    data: result,
  });
});

// Get All Vendors
const getAllVendors = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pick(req.query, [
    'searchTerm',
    'vendor_code',
    'name',
    'short_name',
    'org_code',
    'status',
    'fusion_vendor_id',
    'tax_id',
    'email',
    'phone',
    'website',
    'payment_terms',
    'currency',
    'credit_limit_min',
    'credit_limit_max',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await VendorService.getAllVendors(
    rawFilters,
    paginationOptions
  );
  sendResponse<IVendorWithAddresses[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendors retrieved successfully',
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

// Get Single Vendor
const getSingleVendor = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VendorService.getSingleVendor(Number(id));
  sendResponse<IVendorWithAddresses>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendor retrieved successfully',
    data: result,
  });
});

// Update Vendor
const updateVendor = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await VendorService.updateVendor(Number(id), req.body);
  sendResponse<IVendor>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendor updated successfully',
    data: result,
  });
});

// Delete Vendor
const deleteVendor = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await VendorService.deleteVendor(Number(id));
  sendResponse<IVendor>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Vendor deleted successfully',
  });
});

export const VendorController = {
  createVendor,
  getAllVendors,
  getSingleVendor,
  updateVendor,
  deleteVendor,
};
