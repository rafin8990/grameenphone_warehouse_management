import { z } from 'zod';

// Create vendor validation schema
const createVendorZodSchema = z.object({
  body: z.object({
    vendor_code: z
      .string({
        required_error: 'Vendor code is required',
      })
      .min(1, 'Vendor code must not be empty')
      .max(60, 'Vendor code must not exceed 60 characters'),
    name: z
      .string({
        required_error: 'Vendor name is required',
      })
      .min(1, 'Vendor name must not be empty')
      .max(200, 'Vendor name must not exceed 200 characters'),
    short_name: z
      .string()
      .max(100, 'Short name must not exceed 100 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['active', 'inactive', 'obsolete'])
      .default('active'),
    org_code: z
      .string()
      .max(20, 'Organization code must not exceed 20 characters')
      .optional()
      .nullable(),
    fusion_vendor_id: z
      .string()
      .max(64, 'Fusion vendor ID must not exceed 64 characters')
      .optional()
      .nullable(),
    tax_id: z
      .string()
      .max(50, 'Tax ID must not exceed 50 characters')
      .optional()
      .nullable(),
    email: z
      .string()
      .email('Invalid email format')
      .max(120, 'Email must not exceed 120 characters')
      .optional()
      .nullable(),
    phone: z
      .string()
      .max(50, 'Phone must not exceed 50 characters')
      .optional()
      .nullable(),
    website: z
      .string()
      .url('Invalid website URL')
      .max(200, 'Website must not exceed 200 characters')
      .optional()
      .nullable(),
    payment_terms: z
      .string()
      .max(60, 'Payment terms must not exceed 60 characters')
      .optional()
      .nullable(),
    currency: z
      .string()
      .max(10, 'Currency must not exceed 10 characters')
      .optional()
      .nullable(),
    credit_limit: z
      .number()
      .positive('Credit limit must be a positive number')
      .optional()
      .nullable(),
    addresses: z
      .array(
        z.object({
          type: z
            .enum(['billing', 'shipping', 'head', 'other'])
            .default('billing'),
          line1: z
            .string({
              required_error: 'Address line 1 is required',
            })
            .min(1, 'Address line 1 must not be empty')
            .max(200, 'Address line 1 must not exceed 200 characters'),
          line2: z
            .string()
            .max(200, 'Address line 2 must not exceed 200 characters')
            .optional()
            .nullable(),
          city: z
            .string()
            .max(100, 'City must not exceed 100 characters')
            .optional()
            .nullable(),
          state: z
            .string()
            .max(100, 'State must not exceed 100 characters')
            .optional()
            .nullable(),
          postal_code: z
            .string()
            .max(20, 'Postal code must not exceed 20 characters')
            .optional()
            .nullable(),
          country: z
            .string({
              required_error: 'Country is required',
            })
            .min(1, 'Country must not be empty')
            .max(100, 'Country must not exceed 100 characters'),
          is_default: z
            .boolean()
            .default(false),
          attributes: z
            .record(z.any())
            .optional()
            .nullable(),
        })
      )
      .optional()
      .nullable(),
  }),
});

// Update vendor validation schema
const updateVendorZodSchema = z.object({
  body: z.object({
    vendor_code: z
      .string()
      .min(1, 'Vendor code must not be empty')
      .max(60, 'Vendor code must not exceed 60 characters')
      .optional(),
    name: z
      .string()
      .min(1, 'Vendor name must not be empty')
      .max(200, 'Vendor name must not exceed 200 characters')
      .optional(),
    short_name: z
      .string()
      .max(100, 'Short name must not exceed 100 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['active', 'inactive', 'obsolete'])
      .optional(),
    org_code: z
      .string()
      .max(20, 'Organization code must not exceed 20 characters')
      .optional()
      .nullable(),
    fusion_vendor_id: z
      .string()
      .max(64, 'Fusion vendor ID must not exceed 64 characters')
      .optional()
      .nullable(),
    tax_id: z
      .string()
      .max(50, 'Tax ID must not exceed 50 characters')
      .optional()
      .nullable(),
    email: z
      .string()
      .email('Invalid email format')
      .max(120, 'Email must not exceed 120 characters')
      .optional()
      .nullable(),
    phone: z
      .string()
      .max(50, 'Phone must not exceed 50 characters')
      .optional()
      .nullable(),
    website: z
      .string()
      .url('Invalid website URL')
      .max(200, 'Website must not exceed 200 characters')
      .optional()
      .nullable(),
    payment_terms: z
      .string()
      .max(60, 'Payment terms must not exceed 60 characters')
      .optional()
      .nullable(),
    currency: z
      .string()
      .max(10, 'Currency must not exceed 10 characters')
      .optional()
      .nullable(),
    credit_limit: z
      .number()
      .positive('Credit limit must be a positive number')
      .optional()
      .nullable(),
  }),
});

// Get single vendor validation schema
const getSingleVendorZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Vendor ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Vendor ID must be a positive number',
      }),
  }),
});

// Delete vendor validation schema
const deleteVendorZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Vendor ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Vendor ID must be a positive number',
      }),
  }),
});

// Get all vendors query validation schema
const getAllVendorsZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    vendor_code: z.string().optional(),
    name: z.string().optional(),
    short_name: z.string().optional(),
    org_code: z.string().optional(),
    status: z.enum(['active', 'inactive', 'obsolete']).optional(),
    fusion_vendor_id: z.string().optional(),
    tax_id: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    payment_terms: z.string().optional(),
    currency: z.string().optional(),
    credit_limit_min: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Minimum credit limit must be a non-negative number',
      })
      .transform(val => Number(val))
      .optional(),
    credit_limit_max: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Maximum credit limit must be a non-negative number',
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

export const VendorValidation = {
  createVendorZodSchema,
  updateVendorZodSchema,
  getSingleVendorZodSchema,
  deleteVendorZodSchema,
  getAllVendorsZodSchema,
};
