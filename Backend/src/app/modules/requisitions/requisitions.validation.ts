import { z } from 'zod';

// Create requisition validation schema
const createRequisitionZodSchema = z.object({
  body: z.object({
    requisition_number: z
      .string({
        required_error: 'Requisition number is required',
      })
      .min(1, 'Requisition number must not be empty')
      .max(50, 'Requisition number must not exceed 50 characters'),
    requester_name: z
      .string()
      .max(100, 'Requester name must not exceed 100 characters')
      .optional()
      .nullable(),
    organization_code: z
      .string()
      .max(20, 'Organization code must not exceed 20 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['open', 'approved', 'rejected', 'closed'])
      .default('open'),
    requirement: z
      .string()
      .max(1000, 'Requirement must not exceed 1000 characters')
      .optional()
      .nullable(),
    items: z
      .array(
        z.object({
          item_id: z
            .number({
              required_error: 'Item ID is required',
            })
            .int('Item ID must be an integer')
            .positive('Item ID must be positive'),
          quantity: z
            .number({
              required_error: 'Quantity is required',
            })
            .positive('Quantity must be a positive number'),
          uom: z
            .string()
            .max(16, 'UOM must not exceed 16 characters')
            .optional()
            .nullable(),
          remarks: z
            .string()
            .max(255, 'Remarks must not exceed 255 characters')
            .optional()
            .nullable(),
        })
      )
      .min(1, 'At least one item is required')
      .optional(),
  }),
});

// Update requisition validation schema
const updateRequisitionZodSchema = z.object({
  body: z.object({
    requisition_number: z
      .string()
      .min(1, 'Requisition number must not be empty')
      .max(50, 'Requisition number must not exceed 50 characters')
      .optional(),
    requester_name: z
      .string()
      .max(100, 'Requester name must not exceed 100 characters')
      .optional()
      .nullable(),
    organization_code: z
      .string()
      .max(20, 'Organization code must not exceed 20 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['open', 'approved', 'rejected', 'closed'])
      .optional(),
    requirement: z
      .string()
      .max(1000, 'Requirement must not exceed 1000 characters')
      .optional()
      .nullable(),
    items: z
      .array(
        z.object({
          item_id: z
            .number({
              required_error: 'Item ID is required',
            })
            .int('Item ID must be an integer')
            .positive('Item ID must be positive'),
          quantity: z
            .number({
              required_error: 'Quantity is required',
            })
            .positive('Quantity must be a positive number'),
          uom: z
            .string()
            .max(16, 'UOM must not exceed 16 characters')
            .optional()
            .nullable(),
          remarks: z
            .string()
            .max(255, 'Remarks must not exceed 255 characters')
            .optional()
            .nullable(),
        })
      )
      .optional()
      .nullable(),
  }),
});

// Add requisition item validation schema
const addRequisitionItemZodSchema = z.object({
  body: z.object({
    item_id: z
      .number({
        required_error: 'Item ID is required',
      })
      .int('Item ID must be an integer')
      .positive('Item ID must be positive'),
    quantity: z
      .number({
        required_error: 'Quantity is required',
      })
      .positive('Quantity must be a positive number'),
    uom: z
      .string()
      .max(16, 'UOM must not exceed 16 characters')
      .optional()
      .nullable(),
    remarks: z
      .string()
      .max(255, 'Remarks must not exceed 255 characters')
      .optional()
      .nullable(),
  }),
});

// Update requisition item validation schema
const updateRequisitionItemZodSchema = z.object({
  body: z.object({
    quantity: z
      .number()
      .positive('Quantity must be a positive number')
      .optional(),
    uom: z
      .string()
      .max(16, 'UOM must not exceed 16 characters')
      .optional()
      .nullable(),
    remarks: z
      .string()
      .max(255, 'Remarks must not exceed 255 characters')
      .optional()
      .nullable(),
  }),
});

// Get single requisition validation schema
const getSingleRequisitionZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Requisition ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Requisition ID must be a positive number',
      }),
  }),
});

// Delete requisition validation schema
const deleteRequisitionZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Requisition ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Requisition ID must be a positive number',
      }),
  }),
});

// Get single requisition item validation schema
const getSingleRequisitionItemZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Requisition item ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Requisition item ID must be a positive number',
      }),
  }),
});

// Delete requisition item validation schema
const deleteRequisitionItemZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Requisition item ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Requisition item ID must be a positive number',
      }),
  }),
});

// Get all requisitions query validation schema
const getAllRequisitionsZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    requisition_number: z.string().optional(),
    requester_name: z.string().optional(),
    organization_code: z.string().optional(),
    status: z.enum(['open', 'approved', 'rejected', 'closed']).optional(),
    requirement: z.string().optional(),
    created_at_from: z
      .string()
      .datetime('Invalid date format for created_at_from')
      .optional(),
    created_at_to: z
      .string()
      .datetime('Invalid date format for created_at_to')
      .optional(),
    updated_at_from: z
      .string()
      .datetime('Invalid date format for updated_at_from')
      .optional(),
    updated_at_to: z
      .string()
      .datetime('Invalid date format for updated_at_to')
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

export const RequisitionValidation = {
  createRequisitionZodSchema,
  updateRequisitionZodSchema,
  addRequisitionItemZodSchema,
  updateRequisitionItemZodSchema,
  getSingleRequisitionZodSchema,
  deleteRequisitionZodSchema,
  getSingleRequisitionItemZodSchema,
  deleteRequisitionItemZodSchema,
  getAllRequisitionsZodSchema,
};
