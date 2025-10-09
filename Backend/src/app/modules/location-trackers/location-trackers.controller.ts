import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LocationTrackerService } from './location-trackers.service';
import { ILocationTrackerFilters } from './location-trackers.interface';
import { paginationHelpers } from '../../../helpers/paginationHelper';

const createLocationTracker = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationTrackerService.createLocationTracker(req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Location tracker record created successfully',
    data: result,
  });
});

const getAllLocationTrackers = catchAsync(async (req: Request, res: Response) => {
  const filters: ILocationTrackerFilters = req.query;
  const paginationOptions = paginationHelpers.calculatePagination(req.query);
  
  // Cast sortOrder to the expected type
  const typedPaginationOptions = {
    ...paginationOptions,
    sortOrder: paginationOptions.sortOrder as 'asc' | 'desc' | undefined
  };
  
  const result = await LocationTrackerService.getAllLocationTrackers(filters, typedPaginationOptions);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location trackers retrieved successfully',
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

const getLocationTrackerStats = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationTrackerService.getLocationTrackerStats();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location tracker statistics retrieved successfully',
    data: result,
  });
});

const getCurrentLocationStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await LocationTrackerService.getCurrentLocationStatus();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Current location status retrieved successfully',
    data: result,
  });
});

const getLocationTrackerByLocation = catchAsync(async (req: Request, res: Response) => {
  const { locationCode } = req.params;
  const result = await LocationTrackerService.getLocationTrackerByLocation(locationCode);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Location trackers by location retrieved successfully',
    data: result,
  });
});

export const LocationTrackerController = {
  createLocationTracker,
  getAllLocationTrackers,
  getLocationTrackerStats,
  getCurrentLocationStatus,
  getLocationTrackerByLocation,
};
