import { z } from 'zod';

// Create item validation schema
const createItemZodSchema = z.object({
  body: z.object({
    item_code: z
      .string({
        required_error: 'Item code is required',
      })
      .min(1, 'Item code must not be empty')
      .max(60, 'Item code must not exceed 60 characters'),
    item_description: z
      .string()
      .max(2000, 'Item description must not exceed 2000 characters')
      .optional()
      .nullable(),
    item_status: z
      .enum(['active', 'inactive', 'obsolete'])
      .default('active'),
    org_code: z
      .string()
      .max(20, 'Organization code must not exceed 20 characters')
      .optional()
      .nullable(),
    category_id: z
      .number()
      .int('Category ID must be an integer')
      .positive('Category ID must be positive')
      .optional()
      .nullable(),
    capex_opex: z
      .enum(['CAPEX', 'OPEX'])
      .optional()
      .nullable(),
    tracking_method: z
      .enum(['NONE', 'SERIAL', 'LOT']),
    uom_primary: z
      .string({
        required_error: 'Primary UOM is required',
      })
      .min(1, 'Primary UOM must not be empty')
      .max(16, 'Primary UOM must not exceed 16 characters'),
    uom_secondary: z
      .string()
      .max(16, 'Secondary UOM must not exceed 16 characters')
      .optional()
      .nullable(),
    conversion_to_primary: z
      .number()
      .positive('Conversion to primary must be a positive number')
      .optional()
      .nullable(),
    brand: z
      .string()
      .max(80, 'Brand must not exceed 80 characters')
      .optional()
      .nullable(),
    model: z
      .string()
      .max(80, 'Model must not exceed 80 characters')
      .optional()
      .nullable(),
    manufacturer: z
      .string()
      .max(120, 'Manufacturer must not exceed 120 characters')
      .optional()
      .nullable(),
    hsn_code: z
      .string()
      .max(32, 'HSN code must not exceed 32 characters')
      .optional()
      .nullable(),
    barcode_upc: z
      .string()
      .max(32, 'UPC barcode must not exceed 32 characters')
      .optional()
      .nullable(),
    barcode_ean: z
      .string()
      .max(32, 'EAN barcode must not exceed 32 characters')
      .optional()
      .nullable(),
    gs1_gtin: z
      .string()
      .max(32, 'GS1 GTIN must not exceed 32 characters')
      .optional()
      .nullable(),
    rfid_supported: z
      .boolean()
      .default(true)
      .optional()
      .nullable(),
    default_location_id: z
      .number()
      .int('Default location ID must be an integer')
      .positive('Default location ID must be positive')
      .optional()
      .nullable(),
    min_qty: z
      .number()
      .min(0, 'Minimum quantity must be non-negative')
      .optional()
      .nullable(),
    max_qty: z
      .number()
      .positive('Maximum quantity must be a positive number')
      .optional()
      .nullable(),
    unit_weight_kg: z
      .number()
      .positive('Unit weight must be a positive number')
      .optional()
      .nullable(),
    unit_length_cm: z
      .number()
      .positive('Unit length must be a positive number')
      .optional()
      .nullable(),
    unit_width_cm: z
      .number()
      .positive('Unit width must be a positive number')
      .optional()
      .nullable(),
    unit_height_cm: z
      .number()
      .positive('Unit height must be a positive number')
      .optional()
      .nullable(),
    images: z
      .array(z.string())
      .optional()
      .nullable(),
    specs: z
      .record(z.any())
      .optional()
      .nullable(),
    attributes: z
      .record(z.any())
      .optional()
      .nullable(),
    fusion_item_id: z
      .string()
      .max(64, 'Fusion item ID must not exceed 64 characters')
      .optional()
      .nullable(),
    fusion_category: z
      .string()
      .max(120, 'Fusion category must not exceed 120 characters')
      .optional()
      .nullable(),
  }),
});

// Update item validation schema
const updateItemZodSchema = z.object({
  body: z.object({
    item_code: z
      .string()
      .min(1, 'Item code must not be empty')
      .max(60, 'Item code must not exceed 60 characters')
      .optional(),
    item_description: z
      .string()
      .max(2000, 'Item description must not exceed 2000 characters')
      .optional()
      .nullable(),
    item_status: z
      .enum(['active', 'inactive', 'obsolete'])
      .optional(),
    org_code: z
      .string()
      .max(20, 'Organization code must not exceed 20 characters')
      .optional()
      .nullable(),
    category_id: z
      .number()
      .int('Category ID must be an integer')
      .positive('Category ID must be positive')
      .optional()
      .nullable(),
    capex_opex: z
      .enum(['CAPEX', 'OPEX'])
      .optional()
      .nullable(),
    tracking_method: z
      .enum(['NONE', 'SERIAL', 'LOT'])
      .optional(),
    uom_primary: z
      .string()
      .min(1, 'Primary UOM must not be empty')
      .max(16, 'Primary UOM must not exceed 16 characters')
      .optional(),
    uom_secondary: z
      .string()
      .max(16, 'Secondary UOM must not exceed 16 characters')
      .optional()
      .nullable(),
    conversion_to_primary: z
      .number()
      .positive('Conversion to primary must be a positive number')
      .optional()
      .nullable(),
    brand: z
      .string()
      .max(80, 'Brand must not exceed 80 characters')
      .optional()
      .nullable(),
    model: z
      .string()
      .max(80, 'Model must not exceed 80 characters')
      .optional()
      .nullable(),
    manufacturer: z
      .string()
      .max(120, 'Manufacturer must not exceed 120 characters')
      .optional()
      .nullable(),
    hsn_code: z
      .string()
      .max(32, 'HSN code must not exceed 32 characters')
      .optional()
      .nullable(),
    barcode_upc: z
      .string()
      .max(32, 'UPC barcode must not exceed 32 characters')
      .optional()
      .nullable(),
    barcode_ean: z
      .string()
      .max(32, 'EAN barcode must not exceed 32 characters')
      .optional()
      .nullable(),
    gs1_gtin: z
      .string()
      .max(32, 'GS1 GTIN must not exceed 32 characters')
      .optional()
      .nullable(),
    rfid_supported: z
      .boolean()
      .optional()
      .nullable(),
    default_location_id: z
      .number()
      .int('Default location ID must be an integer')
      .positive('Default location ID must be positive')
      .optional()
      .nullable(),
    min_qty: z
      .number()
      .min(0, 'Minimum quantity must be non-negative')
      .optional()
      .nullable(),
    max_qty: z
      .number()
      .positive('Maximum quantity must be a positive number')
      .optional()
      .nullable(),
    unit_weight_kg: z
      .number()
      .positive('Unit weight must be a positive number')
      .optional()
      .nullable(),
    unit_length_cm: z
      .number()
      .positive('Unit length must be a positive number')
      .optional()
      .nullable(),
    unit_width_cm: z
      .number()
      .positive('Unit width must be a positive number')
      .optional()
      .nullable(),
    unit_height_cm: z
      .number()
      .positive('Unit height must be a positive number')
      .optional()
      .nullable(),
    images: z
      .array(z.string())
      .optional()
      .nullable(),
    specs: z
      .record(z.any())
      .optional()
      .nullable(),
    attributes: z
      .record(z.any())
      .optional()
      .nullable(),
    fusion_item_id: z
      .string()
      .max(64, 'Fusion item ID must not exceed 64 characters')
      .optional()
      .nullable(),
    fusion_category: z
      .string()
      .max(120, 'Fusion category must not exceed 120 characters')
      .optional()
      .nullable(),
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
    item_code: z.string().optional(),
    item_description: z.string().optional(),
    org_code: z.string().optional(),
    category_id: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Category ID must be a positive number',
      })
      .transform(val => Number(val))
      .optional(),
    item_status: z.enum(['active', 'inactive', 'obsolete']).optional(),
    capex_opex: z.enum(['CAPEX', 'OPEX']).optional(),
    tracking_method: z.enum(['NONE', 'SERIAL', 'LOT']).optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    manufacturer: z.string().optional(),
    hsn_code: z.string().optional(),
    barcode_upc: z.string().optional(),
    barcode_ean: z.string().optional(),
    gs1_gtin: z.string().optional(),
    rfid_supported: z
      .string()
      .refine(val => val === 'true' || val === 'false', {
        message: 'RFID supported must be true or false',
      })
      .transform(val => val === 'true')
      .optional(),
    default_location_id: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Default location ID must be a positive number',
      })
      .transform(val => Number(val))
      .optional(),
    min_qty_min: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Minimum quantity must be a non-negative number',
      })
      .transform(val => Number(val))
      .optional(),
    min_qty_max: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Maximum minimum quantity must be a non-negative number',
      })
      .transform(val => Number(val))
      .optional(),
    max_qty_min: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Minimum maximum quantity must be a non-negative number',
      })
      .transform(val => Number(val))
      .optional(),
    max_qty_max: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Maximum maximum quantity must be a non-negative number',
      })
      .transform(val => Number(val))
      .optional(),
    unit_weight_min: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Minimum unit weight must be a non-negative number',
      })
      .transform(val => Number(val))
      .optional(),
    unit_weight_max: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Maximum unit weight must be a non-negative number',
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

export const ItemValidation = {
  createItemZodSchema,
  updateItemZodSchema,
  getSingleItemZodSchema,
  deleteItemZodSchema,
  getAllItemsZodSchema,
};
