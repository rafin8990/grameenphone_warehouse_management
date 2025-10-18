import { z } from 'zod';

// PO item validation schema
const poItemZodSchema = z.object({
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
});

// Create purchase order validation schema
const createPurchaseOrderZodSchema = z.object({
  body: z.object({
    po_number: z
      .string({
        required_error: 'PO number is required',
      })
      .min(1, 'PO number must not be empty')
      .max(100, 'PO number must not exceed 100 characters'),
    po_description: z
      .string()
      .max(5000, 'PO description must not exceed 5000 characters')
      .optional()
      .nullable(),
    supplier_name: z
      .string({
        required_error: 'Supplier name is required',
      })
      .min(1, 'Supplier name must not be empty')
      .max(255, 'Supplier name must not exceed 255 characters'),
    po_type: z
      .string()
      .max(100, 'PO type must not exceed 100 characters')
      .optional()
      .nullable(),
    po_items: z
      .array(poItemZodSchema)
      .optional(),
  }),
});

// Update purchase order validation schema
const updatePurchaseOrderZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Purchase order ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Purchase order ID must be a positive number',
      }),
  }),
  body: z.object({
    po_number: z
      .string()
      .min(1, 'PO number must not be empty')
      .max(100, 'PO number must not exceed 100 characters')
      .optional(),
    po_description: z
      .string()
      .max(5000, 'PO description must not exceed 5000 characters')
      .optional()
      .nullable(),
    supplier_name: z
      .string()
      .min(1, 'Supplier name must not be empty')
      .max(255, 'Supplier name must not exceed 255 characters')
      .optional(),
    po_type: z
      .string()
      .max(100, 'PO type must not exceed 100 characters')
      .optional()
      .nullable(),
    po_items: z.array(poItemZodSchema).optional(),
  }),
});

// Get single purchase order validation schema
const getSinglePurchaseOrderZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Purchase order ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Purchase order ID must be a positive number',
      }),
  }),
});

// Delete purchase order validation schema
const deletePurchaseOrderZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Purchase order ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Purchase order ID must be a positive number',
      }),
  }),
});

// Get all purchase orders validation schema
const getAllPurchaseOrdersZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    po_number: z.string().optional(),
    supplier_name: z.string().optional(),
    po_type: z.string().optional(),
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

// Auto-create purchase order validation schema (PO number is optional)
const autoCreatePurchaseOrderZodSchema = z.object({
  body: z.object({
    po_number: z
      .string()
      .min(1, 'PO number must not be empty')
      .max(100, 'PO number must not exceed 100 characters')
      .optional(),
    po_description: z
      .string()
      .max(5000, 'PO description must not exceed 5000 characters')
      .optional()
      .nullable(),
    supplier_name: z
      .string({
        required_error: 'Supplier name is required',
      })
      .min(1, 'Supplier name must not be empty')
      .max(255, 'Supplier name must not exceed 255 characters'),
    po_type: z
      .string()
      .max(100, 'PO type must not exceed 100 characters')
      .optional()
      .nullable(),
    po_items: z
      .array(poItemZodSchema)
      .min(1, 'At least one item is required')
      .optional(),
    auto_generate_po_number: z.boolean().optional(),
  }),
});

// Update status validation schema
const updateStatusZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'Purchase order ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Purchase order ID must be a positive number',
      }),
  }),
  body: z.object({
    status: z.enum(['received', 'partial', 'cancelled'], {
      required_error: 'Status is required',
      invalid_type_error: 'Status must be one of: received, partial, cancelled',
    }),
  }),
});

export const PurchaseOrderValidation = {
  createPurchaseOrderZodSchema,
  updatePurchaseOrderZodSchema,
  getSinglePurchaseOrderZodSchema,
  deletePurchaseOrderZodSchema,
  getAllPurchaseOrdersZodSchema,
  autoCreatePurchaseOrderZodSchema,
  updateStatusZodSchema,
};
