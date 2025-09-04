import { z } from 'zod';

// Create location validation schema
const createLocationZodSchema = z.object({
  body: z.object({
    sub_inventory_code: z
      .string({
        required_error: 'Sub inventory code is required',
      })
      .min(1, 'Sub inventory code must not be empty')
      .max(50, 'Sub inventory code must not exceed 50 characters'),
    locator_code: z
      .string({
        required_error: 'Locator code is required',
      })
      .min(1, 'Locator code must not be empty')
      .max(50, 'Locator code must not exceed 50 characters'),
    name: z
      .string()
      .max(120, 'Name must not exceed 120 characters')
      .optional()
      .nullable(),
    description: z
      .string()
      .max(1000, 'Description must not exceed 1000 characters')
      .optional()
      .nullable(),
    org_code: z
      .string()
      .max(20, 'Organization code must not exceed 20 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['active', 'inactive', 'obsolete'], {
        errorMap: () => ({
          message: 'Status must be either active, inactive, or obsolete',
        }),
      })
      .default('active'),
    capacity: z
      .number()
      .positive('Capacity must be a positive number')
      .optional()
      .nullable(),
    attributes: z
      .record(z.any())
      .optional()
      .nullable(),
  }),
});

// Update location validation schema
const updateLocationZodSchema = z.object({
  body: z.object({
    sub_inventory_code: z
      .string()
      .min(1, 'Sub inventory code must not be empty')
      .max(50, 'Sub inventory code must not exceed 50 characters')
      .optional(),
    locator_code: z
      .string()
      .min(1, 'Locator code must not be empty')
      .max(50, 'Locator code must not exceed 50 characters')
      .optional(),
    name: z
      .string()
      .max(120, 'Name must not exceed 120 characters')
      .optional()
      .nullable(),
    description: z
      .string()
      .max(1000, 'Description must not exceed 1000 characters')
      .optional()
      .nullable(),
    org_code: z
      .string()
      .max(20, 'Organization code must not exceed 20 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['active', 'inactive', 'obsolete'], {
        errorMap: () => ({
          message: 'Status must be either active, inactive, or obsolete',
        }),
      })
      .optional(),
    capacity: z
      .number()
      .positive('Capacity must be a positive number')
      .optional()
      .nullable(),
    attributes: z
      .record(z.any())
      .optional()
      .nullable(),
  }),
});

// Get single location validation schema
const getSingleLocationZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Location ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Location ID must be a positive number',
      }),
  }),
});

// Delete location validation schema
const deleteLocationZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Location ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Location ID must be a positive number',
      }),
  }),
});

// Get all locations query validation schema
const getAllLocationsZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    sub_inventory_code: z.string().optional(),
    locator_code: z.string().optional(),
    name: z.string().optional(),
    org_code: z.string().optional(),
    status: z.enum(['active', 'inactive', 'obsolete']).optional(),
    capacity_min: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Minimum capacity must be a non-negative number',
      })
      .transform(val => Number(val))
      .optional(),
    capacity_max: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Maximum capacity must be a non-negative number',
      })
      .transform(val => Number(val))
      .optional(),
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

export const LocationValidation = {
  createLocationZodSchema,
  updateLocationZodSchema,
  getSingleLocationZodSchema,
  deleteLocationZodSchema,
  getAllLocationsZodSchema,
};
