import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { ILocation } from './locations.interface';
import { LocationService } from './locations.service';

// Create Location
const createLocation = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await LocationService.createLocation(data);
  sendResponse<ILocation>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Location created successfully',
    data: result,
  });
});

// Get All Locations
const getAllLocations = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pick(req.query, [
    'searchTerm',
    'sub_inventory_code',
    'locator_code',
    'name',
    'org_code',
    'status',
    'capacity_min',
    'capacity_max',
  ]);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await LocationService.getAllLocations(
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

  sendResponse<ILocation[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Locations retrieved successfully',
    meta: paginationMeta,
    data: result.data,
  });
});

// Get Single Location
const getSingleLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await LocationService.getSingleLocation(Number(id));
  sendResponse<ILocation>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location retrieved successfully',
    data: result,
  });
});

// Update Location
const updateLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await LocationService.updateLocation(Number(id), data);
  sendResponse<ILocation>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location updated successfully',
    data: result,
  });
});

// Delete Location
const deleteLocation = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await LocationService.deleteLocation(Number(id));
  sendResponse<ILocation>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location deleted successfully',
    data: null,
  });
});

export const LocationController = {
  createLocation,
  getAllLocations,
  getSingleLocation,
  updateLocation,
  deleteLocation,
};
