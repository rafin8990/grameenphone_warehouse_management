import { z } from 'zod';

// RFID tag validation schema
const poItemRfidZodSchema = z.object({
  rfid_id: z
    .number({
      required_error: 'RFID ID is required',
    })
    .int('RFID ID must be an integer')
    .positive('RFID ID must be positive'),
  quantity: z
    .number({
      required_error: 'Quantity is required',
    })
    .positive('Quantity must be positive')
    .default(1),
});

// PO item validation schema
const poItemZodSchema = z.object({
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
    .positive('Quantity must be positive'),
  unit: z
    .string({
      required_error: 'Unit is required',
    })
    .min(1, 'Unit must not be empty')
    .max(16, 'Unit must not exceed 16 characters'),
  unit_price: z
    .number()
    .positive('Unit price must be positive')
    .optional()
    .nullable(),
  tax_percent: z
    .number()
    .min(0, 'Tax percent must be non-negative')
    .max(100, 'Tax percent must not exceed 100')
    .optional()
    .nullable(),
  rfid_tags: z.array(poItemRfidZodSchema).optional(),
});

// Create purchase order validation schema
const createPurchaseOrderZodSchema = z.object({
  body: z.object({
    po_number: z
      .string({
        required_error: 'PO number is required',
      })
      .min(1, 'PO number must not be empty')
      .max(60, 'PO number must not exceed 60 characters'),
    vendor_id: z
      .number({
        required_error: 'Vendor ID is required',
      })
      .int('Vendor ID must be an integer')
      .positive('Vendor ID must be positive'),
    total_amount: z
      .number()
      .positive('Total amount must be positive')
      .optional()
      .nullable(),
    requisition_id: z
      .number()
      .int('Requisition ID must be an integer')
      .positive('Requisition ID must be positive')
      .optional()
      .nullable(),
    status: z
      .enum(['pending', 'approved', 'partially_received', 'received', 'closed', 'cancelled'], {
        errorMap: () => ({
          message: 'Status must be one of: pending, approved, partially_received, received, closed, cancelled',
        }),
      })
      .default('pending'),
    currency: z
      .string()
      .min(1, 'Currency must not be empty')
      .max(10, 'Currency must not exceed 10 characters')
      .default('BDT'),
    status_reason: z
      .string()
      .max(120, 'Status reason must not exceed 120 characters')
      .optional()
      .nullable(),
    items: z.array(poItemZodSchema).optional(),
  }),
});

// Update purchase order validation schema
const updatePurchaseOrderZodSchema = z.object({
  body: z.object({
    po_number: z
      .string()
      .min(1, 'PO number must not be empty')
      .max(60, 'PO number must not exceed 60 characters')
      .optional(),
    vendor_id: z
      .number()
      .int('Vendor ID must be an integer')
      .positive('Vendor ID must be positive')
      .optional(),
    total_amount: z
      .number()
      .positive('Total amount must be positive')
      .optional()
      .nullable(),
    requisition_id: z
      .number()
      .int('Requisition ID must be an integer')
      .positive('Requisition ID must be positive')
      .optional()
      .nullable(),
    status: z
      .enum(['pending', 'approved', 'partially_received', 'received', 'closed', 'cancelled'], {
        errorMap: () => ({
          message: 'Status must be one of: pending, approved, partially_received, received, closed, cancelled',
        }),
      })
      .optional(),
    currency: z
      .string()
      .min(1, 'Currency must not be empty')
      .max(10, 'Currency must not exceed 10 characters')
      .optional(),
    status_reason: z
      .string()
      .max(120, 'Status reason must not exceed 120 characters')
      .optional()
      .nullable(),
    items: z.array(poItemZodSchema).optional(),
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
    vendor_id: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Vendor ID must be a positive number',
      })
      .optional(),
    status: z.enum(['pending', 'approved', 'partially_received', 'received', 'closed', 'cancelled']).optional(),
    requisition_id: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Requisition ID must be a positive number',
      })
      .optional(),
    page: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Page must be a positive number',
      })
      .optional(),
    limit: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Limit must be a positive number',
      })
      .optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export const PurchaseOrderValidation = {
  createPurchaseOrderZodSchema,
  updatePurchaseOrderZodSchema,
  getSinglePurchaseOrderZodSchema,
  deletePurchaseOrderZodSchema,
  getAllPurchaseOrdersZodSchema,
};
