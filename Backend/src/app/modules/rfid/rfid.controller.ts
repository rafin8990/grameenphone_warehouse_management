import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IRfidTag, IUHFTagRequest, IUHFTagsBatchRequest, IUHFResponse } from './rfid.interface';
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
  const rawFilters = pick(req.query, ['searchTerm', 'epc', 'status']);
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

// Check RFID Tags
const checkRfidTags = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  
  const result = await RfidService.checkRfidTags(data);
  if (Array.isArray(data)) {
    res.status(200).json({
      success: true,
      message: `Checked ${data.length} RFID tags`,
      data: {
        found: result.found,
        notFound: result.notFound,
        summary: {
          total: data.length,
          found: result.found.length,
          notFound: result.notFound.length,
          errors: result.errors.length
        }
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  } else {
    if (result.found.length > 0) {
      res.status(200).json({
        success: true,
        message: 'RFID tag found',
        data: {
          found: result.found[0],
          exists: true
        }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'RFID tag not found',
        data: {
          exists: false,
          notFound: result.notFound[0] || 'Unknown tag'
        },
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    }
  }
});

// Assign RFID Tag to Item
const assignRfidTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const result = await RfidService.assignRfidTag(Number(id));
  sendResponse<IRfidTag>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'RFID tag assigned successfully',
    data: result,
  });
});

// Unassign RFID Tag
const unassignRfidTag = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const result = await RfidService.unassignRfidTag(Number(id));
  sendResponse<IRfidTag>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'RFID tag unassigned successfully',
    data: result,
  });
});

// Create Bulk RFID Tags
const createBulkRfidTags = catchAsync(async (req: Request, res: Response) => {
  const dataArray = req.body;
  
  if (!Array.isArray(dataArray)) {
    return res.status(400).json({
      success: false,
      message: 'Request body must be an array of RFID tag data',
    });
  }

  const result = await RfidService.createBulkRfidTags(dataArray);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `Bulk RFID tags processed. Created: ${result.created.length}, Duplicates: ${result.duplicates.length}, Errors: ${result.errors.length}`,
    data: {
      created: result.created,
      duplicates: result.duplicates,
      errors: result.errors,
      summary: {
        total: dataArray.length,
        created: result.created.length,
        duplicates: result.duplicates.length,
        errors: result.errors.length
      }
    },
  });
});

// Check if EPC is duplicate
const checkDuplicateEpc = catchAsync(async (req: Request, res: Response) => {
  const { epc } = req.params;
  
  const isDuplicate = await RfidService.checkDuplicateEpc(epc);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: isDuplicate ? 'EPC already exists' : 'EPC is available',
    data: {
      epc,
      isDuplicate,
      available: !isDuplicate
    },
  });
});

// UHF-specific controller methods to match Java code
const sendUHFTag = catchAsync(async (req: Request, res: Response) => {
  const tagRequest: IUHFTagRequest = req.body;
  
  const result = await RfidService.sendUHFTag(tagRequest);
  
  res.status(result.code).json({
    success: result.success,
    message: result.message,
    data: result.data,
    code: result.code
  });
});

const sendUHFTagsBatch = catchAsync(async (req: Request, res: Response) => {
  const batchRequest: IUHFTagsBatchRequest = req.body;
  
  const result = await RfidService.sendUHFTagsBatch(batchRequest);
  
  res.status(result.code).json({
    success: result.success,
    message: result.message,
    data: result.data,
    code: result.code
  });
});

const getUHFTags = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  
  const result = await RfidService.getUHFTags(Number(page), Number(limit));
  
  res.status(result.code).json({
    success: result.success,
    message: result.message,
    data: result.data,
    code: result.code
  });
});

const deleteUHFTag = catchAsync(async (req: Request, res: Response) => {
  const { epc } = req.params;
  
  const result = await RfidService.deleteUHFTag(epc);
  
  res.status(result.code).json({
    success: result.success,
    message: result.message,
    data: result.data,
    code: result.code
  });
});

export const RfidController = {
  createRfidTag,
  createBulkRfidTags,
  checkDuplicateEpc,
  getAllRfidTags,
  getSingleRfidTag,
  updateRfidTag,
  deleteRfidTag,
  checkRfidTags,
  assignRfidTag,
  unassignRfidTag,
  // UHF-specific methods
  sendUHFTag,
  sendUHFTagsBatch,
  getUHFTags,
  deleteUHFTag,
};
