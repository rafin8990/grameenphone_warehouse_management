import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LocationService } from './locations.service';
import { ILocationFilters } from './locations.interface';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createLocation = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationService.createLocation(req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Location created successfully',
    data: result,
  });
});

const getAllLocations = catchAsync(async (req: Request, res: Response) => {
  const filters: ILocationFilters = req.query;
  const paginationOptions = paginationHelpers.calculatePagination(req.query);
  
  // Cast sortOrder to the expected type
  const typedPaginationOptions = {
    ...paginationOptions,
    sortOrder: paginationOptions.sortOrder as 'asc' | 'desc' | undefined
  };
  
  const result = await LocationService.getAllLocations(filters, typedPaginationOptions);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Locations retrieved successfully',
    meta: result.meta ? {
      page: result.meta.page || 1,
      limit: result.meta.limit || 10,
      total: result.meta.total || 0,
      totalPages: result.meta.totalPages,
      hasNext: result.meta.hasNext,
      hasPrev: result.meta.hasPrev,
    } : undefined,
    data: result.data,
  });
});

const getSingleLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LocationService.getSingleLocation(Number(id));
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location retrieved successfully',
    data: result,
  });
});

const updateLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LocationService.updateLocation(Number(id), req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location updated successfully',
    data: result,
  });
});

const deleteLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await LocationService.deleteLocation(Number(id));
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location deleted successfully',
  });
});

const getLocationStats = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationService.getLocationStats();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location statistics retrieved successfully',
    data: result,
  });
});

export const LocationController = {
  createLocation,
  getAllLocations,
  getSingleLocation,
  updateLocation,
  deleteLocation,
  getLocationStats,
};
