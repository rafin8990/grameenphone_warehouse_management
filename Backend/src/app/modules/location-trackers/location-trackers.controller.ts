import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LocationTrackerService } from './location-trackers.service';
import { ILocationTrackerFilters } from './location-trackers.interface';
import { paginationHelpers } from '../../../helpers/paginationHelper';

// Process Location Scan
const processLocationScan = catchAsync(async (req: Request, res: Response) => {
  const scanData = req.body;
  const result = await LocationTrackerService.processLocationScan(scanData);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Location scan processed successfully',
    data: result,
  });
});

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
  // Separate filters from pagination options
  const { page, limit, sortBy, sortOrder, ...filterParams } = req.query;
  
  const filters: ILocationTrackerFilters = filterParams;
  const paginationOptions = {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy as string,
    sortOrder: (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder as 'asc' | 'desc' : undefined
  };
  
  console.log('🔍 [Controller] Separated params:', { 
    filters, 
    paginationOptions,
    originalQuery: req.query 
  });
  
  const result = await LocationTrackerService.getAllLocationTrackers(filters, paginationOptions);
  
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
  processLocationScan,
  createLocationTracker,
  getAllLocationTrackers,
  getLocationTrackerStats,
  getCurrentLocationStatus,
  getLocationTrackerByLocation,
};
