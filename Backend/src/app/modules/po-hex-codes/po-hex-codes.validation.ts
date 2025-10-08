import { z } from 'zod';

// Create PO hex code validation schema
const createPoHexCodeZodSchema = z.object({
  body: z.object({
    po_number: z
      .string({
        required_error: 'PO number is required',
      })
      .min(1, 'PO number must not be empty')
      .max(100, 'PO number must not exceed 100 characters'),
    lot_no: z
      .string({
        required_error: 'Lot number is required',
      })
      .min(1, 'Lot number must not be empty')
      .max(100, 'Lot number must not exceed 100 characters'),
    item_number: z
      .string({
        required_error: 'Item number is required',
      })
      .min(1, 'Item number must not be empty')
      .max(255, 'Item number must not exceed 255 characters'),
    quantity: z
      .number({
        required_error: 'Quantity is required',
      })
      .positive('Quantity must be positive'),
    uom: z
      .string({
        required_error: 'UOM is required',
      })
      .min(1, 'UOM must not be empty')
      .max(50, 'UOM must not exceed 50 characters'),
  }),
});

// Update PO hex code validation schema (hex_code cannot be updated)
const updatePoHexCodeZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'ID must be a positive number',
      }),
  }),
  body: z.object({
    po_number: z
      .string()
      .min(1, 'PO number must not be empty')
      .max(100, 'PO number must not exceed 100 characters')
      .optional(),
    lot_no: z
      .string()
      .min(1, 'Lot number must not be empty')
      .max(100, 'Lot number must not exceed 100 characters')
      .optional(),
    item_number: z
      .string()
      .min(1, 'Item number must not be empty')
      .max(255, 'Item number must not exceed 255 characters')
      .optional(),
    quantity: z
      .number()
      .positive('Quantity must be positive')
      .optional(),
    uom: z
      .string()
      .min(1, 'UOM must not be empty')
      .max(50, 'UOM must not exceed 50 characters')
      .optional(),
  }),
});

// Get single PO hex code validation schema
const getSinglePoHexCodeZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'ID must be a positive number',
      }),
  }),
});

// Delete PO hex code validation schema
const deletePoHexCodeZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'ID must be a positive number',
      }),
  }),
});

// Get all PO hex codes validation schema
const getAllPoHexCodesZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    po_number: z.string().optional(),
    lot_no: z.string().optional(),
    item_number: z.string().optional(),
    hex_code: z.string().optional(),
    page: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Page must be a positive number',
      })
      .transform(val => Number(val))
      .optional(),
    limit: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Limit must be a positive number',
      })
      .transform(val => Number(val))
      .optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const PoHexCodeValidation = {
  createPoHexCodeZodSchema,
  updatePoHexCodeZodSchema,
  getSinglePoHexCodeZodSchema,
  deletePoHexCodeZodSchema,
  getAllPoHexCodesZodSchema,
};

