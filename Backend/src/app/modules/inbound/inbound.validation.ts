import { z } from 'zod';

// RFID scan data validation
const processRfidScanZodSchema = z.object({
  body: z.object({
    epc: z
      .string({
        required_error: 'EPC is required',
      })
      .min(1, 'EPC must not be empty'),
    rssi: z.string().optional(),
    count: z.number().optional(),
    timestamp: z.number().optional(),
    deviceId: z.string().optional(),
  }),
});

// Update inbound validation schema
const updateInboundZodSchema = z.object({
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
    po_number: z.string().optional(),
    items: z.array(z.any()).optional(),
    received_at: z.string().optional(),
  }),
});

// Get single inbound validation schema
const getSingleInboundZodSchema = z.object({
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

// Delete inbound validation schema
const deleteInboundZodSchema = z.object({
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

// Get all inbounds validation schema
const getAllInboundsZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    po_number: z.string().optional(),
    received_at: z.string().optional(),
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

export const InboundValidation = {
  processRfidScanZodSchema,
  updateInboundZodSchema,
  getSingleInboundZodSchema,
  deleteInboundZodSchema,
  getAllInboundsZodSchema,
};

