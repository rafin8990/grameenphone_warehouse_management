import { Request, Response } from 'express';
import httpStatus from 'http-status';

import { DashboardService } from './dashboard.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

const getDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getDashboardStats();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard statistics retrieved successfully',
    data: result,
  });
});

const getDashboardData = catchAsync(async (req: Request, res: Response) => {
  console.log('Dashboard API called');
  const result = await DashboardService.getDashboardData();
  console.log('Dashboard data result:', JSON.stringify(result, null, 2));
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard data retrieved successfully',
    data: result,
  });
});

export const DashboardController = {
  getDashboardStats,
  getDashboardData,
};
