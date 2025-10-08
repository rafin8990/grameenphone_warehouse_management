import { z } from 'zod';

// Create item validation schema
const createItemZodSchema = z.object({
  body: z.object({
    item_number: z
      .string({
        required_error: 'Item number is required',
      })
      .min(1, 'Item number must not be empty')
      .max(255, 'Item number must not exceed 255 characters'),
    item_description: z
      .string()
      .max(5000, 'Item description must not exceed 5000 characters')
      .optional()
      .nullable(),
    item_type: z
      .string()
      .max(100, 'Item type must not exceed 100 characters')
      .optional()
      .nullable(),
    inventory_organization: z
      .string()
      .max(255, 'Inventory organization must not exceed 255 characters')
      .optional()
      .nullable(),
    primary_uom: z
      .string()
      .max(100, 'Primary UOM must not exceed 100 characters')
      .optional()
      .nullable(),
    uom_code: z
      .string({
        required_error: 'UOM code is required',
      })
      .min(1, 'UOM code must not be empty')
      .max(50, 'UOM code must not exceed 50 characters'),
    item_status: z
      .enum(['active', 'inactive'])
      .default('active'),
  }),
});

// Update item validation schema
const updateItemZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Item ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Item ID must be a positive number',
      }),
  }),
  body: z.object({
    item_number: z
      .string()
      .min(1, 'Item number must not be empty')
      .max(255, 'Item number must not exceed 255 characters')
      .optional(),
    item_description: z
      .string()
      .max(5000, 'Item description must not exceed 5000 characters')
      .optional()
      .nullable(),
    item_type: z
      .string()
      .max(100, 'Item type must not exceed 100 characters')
      .optional()
      .nullable(),
    inventory_organization: z
      .string()
      .max(255, 'Inventory organization must not exceed 255 characters')
      .optional()
      .nullable(),
    primary_uom: z
      .string()
      .max(100, 'Primary UOM must not exceed 100 characters')
      .optional()
      .nullable(),
    uom_code: z
      .string()
      .min(1, 'UOM code must not be empty')
      .max(50, 'UOM code must not exceed 50 characters')
      .optional(),
    item_status: z
      .enum(['active', 'inactive'])
      .optional(),
  }),
});

// Get single item validation schema
const getSingleItemZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Item ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Item ID must be a positive number',
      }),
  }),
});

// Delete item validation schema
const deleteItemZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Item ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Item ID must be a positive number',
      }),
  }),
});

// Get all items query validation schema
const getAllItemsZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    item_number: z.string().optional(),
    item_description: z.string().optional(),
    item_type: z.string().optional(),
    inventory_organization: z.string().optional(),
    primary_uom: z.string().optional(),
    uom_code: z.string().optional(),
    item_status: z.enum(['active', 'inactive']).optional(),
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

export const ItemValidation = {
  createItemZodSchema,
  updateItemZodSchema,
  getSingleItemZodSchema,
  deleteItemZodSchema,
  getAllItemsZodSchema,
};
