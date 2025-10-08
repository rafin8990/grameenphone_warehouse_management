import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { paginationFields } from '../../../constants/pagination';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import catchAsync from '../../../shared/catchAsync';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { IPoHexCode } from './po-hex-codes.interface';
import { PoHexCodeService } from './po-hex-codes.service';

// Create PO Hex Code
const createPoHexCode = catchAsync(async (req: Request, res: Response) => {
  const data = req.body;
  const result = await PoHexCodeService.createPoHexCode(data);
  sendResponse<IPoHexCode>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'PO hex code created successfully',
    data: result,
  });
});

// Get All PO Hex Codes
const getAllPoHexCodes = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, [
    'searchTerm',
    'po_number',
    'lot_no',
    'item_number',
    'hex_code',
  ]);

  const paginationOptions = pick(req.query, paginationFields);

  const result = await PoHexCodeService.getAllPoHexCodes(filters, paginationOptions);

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

  sendResponse<IPoHexCode[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO hex codes retrieved successfully',
    meta: paginationMeta,
    data: result.data,
  });
});

// Get Single PO Hex Code
const getSinglePoHexCode = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PoHexCodeService.getSinglePoHexCode(Number(id));
  sendResponse<IPoHexCode>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO hex code retrieved successfully',
    data: result,
  });
});

// Update PO Hex Code (hex_code cannot be updated)
const updatePoHexCode = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await PoHexCodeService.updatePoHexCode(Number(id), data);
  sendResponse<IPoHexCode>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO hex code updated successfully',
    data: result,
  });
});

// Delete PO Hex Code
const deletePoHexCode = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await PoHexCodeService.deletePoHexCode(Number(id));
  sendResponse<IPoHexCode>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'PO hex code deleted successfully',
    data: null,
  });
});

export const PoHexCodeController = {
  createPoHexCode,
  getAllPoHexCodes,
  getSinglePoHexCode,
  updatePoHexCode,
  deletePoHexCode,
};

