import { z } from 'zod';

// Create category validation schema
const createCategoryZodSchema = z.object({
  body: z.object({
    code: z
      .string({
        required_error: 'Code is required',
      })
      .min(1, 'Code must not be empty')
      .max(60, 'Code must not exceed 60 characters'),
    name: z
      .string({
        required_error: 'Name is required',
      })
      .min(1, 'Name must not be empty')
      .max(120, 'Name must not exceed 120 characters'),
    description: z
      .string()
      .max(1000, 'Description must not exceed 1000 characters')
      .optional()
      .nullable(),
    parent_id: z
      .number()
      .int('Parent ID must be an integer')
      .positive('Parent ID must be positive')
      .optional()
      .nullable(),
    status: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({
          message: 'Status must be either active or inactive',
        }),
      })
      .default('active'),
    fusion_category_code: z
      .string()
      .max(120, 'Fusion category code must not exceed 120 characters')
      .optional()
      .nullable(),
  }),
});

// Update category validation schema
const updateCategoryZodSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(1, 'Code must not be empty')
      .max(60, 'Code must not exceed 60 characters')
      .optional(),
    name: z
      .string()
      .min(1, 'Name must not be empty')
      .max(120, 'Name must not exceed 120 characters')
      .optional(),
    description: z
      .string()
      .max(1000, 'Description must not exceed 1000 characters')
      .optional()
      .nullable(),
    parent_id: z
      .number()
      .int('Parent ID must be an integer')
      .positive('Parent ID must be positive')
      .optional()
      .nullable(),
    status: z
      .enum(['active', 'inactive'], {
        errorMap: () => ({
          message: 'Status must be either active or inactive',
        }),
      })
      .optional(),
    fusion_category_code: z
      .string()
      .max(120, 'Fusion category code must not exceed 120 characters')
      .optional()
      .nullable(),
  }),
});

// Get single category validation schema
const getSingleCategoryZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Category ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Category ID must be a positive number',
      }),
  }),
});

// Delete category validation schema
const deleteCategoryZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Category ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Category ID must be a positive number',
      }),
  }),
});

// Get all categories query validation schema
const getAllCategoriesZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    code: z.string().optional(),
    name: z.string().optional(),
    parent_id: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Parent ID must be a positive number',
      })
      .transform(val => Number(val))
      .optional(),
    status: z.enum(['active', 'inactive']).optional(),
    fusion_category_code: z.string().optional(),
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

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
  getSingleCategoryZodSchema,
  deleteCategoryZodSchema,
  getAllCategoriesZodSchema,
};
