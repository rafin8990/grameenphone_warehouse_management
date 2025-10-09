import { z } from 'zod';

const createLocationZodSchema = z.object({
  body: z.object({
    location_name: z.string({
      required_error: 'Location name is required',
    }).min(1, 'Location name cannot be empty'),
    location_code: z.string({
      required_error: 'Location code is required',
    }).min(1, 'Location code cannot be empty'),
    sub_inventory_code: z.string().optional(),
  }),
});

const updateLocationZodSchema = z.object({
  body: z.object({
    location_name: z.string().min(1, 'Location name cannot be empty').optional(),
    location_code: z.string().min(1, 'Location code cannot be empty').optional(),
    sub_inventory_code: z.string().optional(),
  }),
});

const getLocationsZodSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    searchTerm: z.string().optional(),
    location_name: z.string().optional(),
    location_code: z.string().optional(),
    sub_inventory_code: z.string().optional(),
  }),
});

export const LocationValidation = {
  createLocationZodSchema,
  updateLocationZodSchema,
  getLocationsZodSchema,
};
