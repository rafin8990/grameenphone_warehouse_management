import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LocationService } from './locations.service';
import { ILocationFilters } from './locations.interface';

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
  
  const result = await LocationService.getAllLocations(filters, {});
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Locations retrieved successfully',
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
