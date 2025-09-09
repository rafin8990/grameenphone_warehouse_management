import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IRfidTag } from './rfid.interface';
import { RfidService } from './rfid.service';

// Create RFID Tag
const createRfidTag = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;

  const result = await RfidService.createRfidTag(data);

  sendResponse<IRfidTag>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'RFID tag created successfully',
    data: result,
  });
});

// const createRfidTag = catchAsync(async (req: Request, res: Response) => {
//   const data = req.body;
//   console.log("Incoming RFID payload:", data);

//   // Echo the JSON back to the RFID reader / client
//   return res.status(200).json({
//     success: true,
//     message: "RFID data received",
//     data,
//   });
// });

// Get All RFID Tags
const getAllRfidTags = catchAsync(async (req: Request, res: Response) => {
  const rawFilters = pick(req.query, ['searchTerm', 'tag_uid', 'status']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await RfidService.getAllRfidTags(
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

  sendResponse<IRfidTag[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'RFID tags retrieved successfully',
    meta: paginationMeta,
    data: result.data,
  });
});

// Get Single RFID Tag
const getSingleRfidTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await RfidService.getSingleRfidTag(Number(id));
  sendResponse<IRfidTag>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'RFID tag retrieved successfully',
    data: result,
  });
});

// Update RFID Tag
const updateRfidTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await RfidService.updateRfidTag(Number(id), data);
  sendResponse<IRfidTag>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'RFID tag updated successfully',
    data: result,
  });
});

// Delete RFID Tag
const deleteRfidTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await RfidService.deleteRfidTag(Number(id));
  sendResponse<IRfidTag>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'RFID tag deleted successfully',
    data: null,
  });
});

export const RfidController = {
  createRfidTag,
  getAllRfidTags,
  getSingleRfidTag,
  updateRfidTag,
  deleteRfidTag,
};
