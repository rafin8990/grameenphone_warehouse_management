import { z } from 'zod';

// Create RFID tag validation schema
const createRfidTagZodSchema = z.object({
  body: z.object({
    epc: z
      .string({ required_error: 'EPC is required' })
      .min(1, 'EPC must not be empty')
      .max(255, 'EPC must not exceed 255 characters'),
    timestamp: z
      .string()
      .datetime('Invalid timestamp format')
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    location: z
      .string()
      .max(100, 'Location must not exceed 100 characters')
      .optional()
      .nullable(),
    reader_id: z
      .string()
      .max(50, 'Reader ID must not exceed 50 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['Available', 'Reserved', 'Assigned', 'Consumed', 'Lost', 'Damaged'], {
        errorMap: () => ({
          message:
            'Status must be one of: Available, Reserved, Assigned, Consumed, Lost, Damaged',
        }),
      })
      .default('Available'),
    rssi: z
      .string()
      .max(20, 'RSSI must not exceed 20 characters')
      .optional()
      .nullable(),
    count: z
      .number()
      .int('Count must be an integer')
      .min(1, 'Count must be at least 1')
      .optional()
      .nullable(),
    device_id: z
      .string()
      .max(100, 'Device ID must not exceed 100 characters')
      .optional()
      .nullable(),
    session_id: z
      .string()
      .max(100, 'Session ID must not exceed 100 characters')
      .optional()
      .nullable(),
    parent_tag: z
      .number()
      .int('Parent tag must be an integer')
      .positive('Parent tag must be a positive number')
      .optional()
      .nullable(),
  }),
});


// Update RFID tag validation schema
const updateRfidTagZodSchema = z.object({
  body: z.object({
    epc: z
      .string()
      .min(1, 'EPC must not be empty')
      .max(255, 'EPC must not exceed 255 characters')
      .optional(),
    timestamp: z
      .string()
      .datetime('Invalid timestamp format')
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    location: z
      .string()
      .max(100, 'Location must not exceed 100 characters')
      .optional()
      .nullable(),
    reader_id: z
      .string()
      .max(50, 'Reader ID must not exceed 50 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['Available', 'Reserved', 'Assigned', 'Consumed', 'Lost', 'Damaged'], {
        errorMap: () => ({
          message: 'Status must be one of: Available, Reserved, Assigned, Consumed, Lost, Damaged',
        }),
      })
      .optional(),
    rssi: z
      .string()
      .max(20, 'RSSI must not exceed 20 characters')
      .optional()
      .nullable(),
    count: z
      .number()
      .int('Count must be an integer')
      .min(1, 'Count must be at least 1')
      .optional()
      .nullable(),
    device_id: z
      .string()
      .max(100, 'Device ID must not exceed 100 characters')
      .optional()
      .nullable(),
    session_id: z
      .string()
      .max(100, 'Session ID must not exceed 100 characters')
      .optional()
      .nullable(),
    parent_tag: z
      .number()
      .int('Parent tag must be an integer')
      .positive('Parent tag must be a positive number')
      .optional()
      .nullable(),
  }),
});

// Get single RFID tag validation schema
const getSingleRfidTagZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'RFID tag ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'RFID tag ID must be a positive number',
      }),
  }),
});

// Delete RFID tag validation schema
const deleteRfidTagZodSchema = z.object({
  params: z.object({
    id: z
      .string({
        required_error: 'RFID tag ID is required',
      })
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'RFID tag ID must be a positive number',
      }),
  }),
});

// Get all RFID tags validation schema
const getAllRfidTagsZodSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    epc: z.string().optional(),
    status: z
      .enum(['Available', 'Reserved', 'Assigned', 'Consumed', 'Lost', 'Damaged'])
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

// Bulk create RFID tags validation schema
const createBulkRfidTagsZodSchema = z.object({
  body: z.array(z.object({
    epc: z
      .string({ required_error: 'EPC is required' })
      .min(1, 'EPC must not be empty')
      .max(255, 'EPC must not exceed 255 characters'),
    timestamp: z
      .string()
      .datetime('Invalid timestamp format')
      .optional()
      .transform((val) => val ? new Date(val) : undefined),
    location: z
      .string()
      .max(100, 'Location must not exceed 100 characters')
      .optional()
      .nullable(),
    reader_id: z
      .string()
      .max(50, 'Reader ID must not exceed 50 characters')
      .optional()
      .nullable(),
    status: z
      .enum(['Available', 'Reserved', 'Assigned', 'Consumed', 'Lost', 'Damaged'], {
        errorMap: () => ({
          message:
            'Status must be one of: Available, Reserved, Assigned, Consumed, Lost, Damaged',
        }),
      })
      .default('Available'),
  })).min(1, 'At least one RFID tag is required'),
});

// Check duplicate EPC validation schema
const checkDuplicateEpcZodSchema = z.object({
  params: z.object({
    epc: z
      .string({ required_error: 'EPC is required' })
      .min(1, 'EPC must not be empty')
      .max(255, 'EPC must not exceed 255 characters'),
  }),
});

// UHF-specific validation schemas to match Java code
const sendUHFTagZodSchema = z.object({
  body: z.object({
    epc: z
      .string({ required_error: 'EPC is required' })
      .min(1, 'EPC must not be empty')
      .max(255, 'EPC must not exceed 255 characters'),
    rssi: z
      .string({ required_error: 'RSSI is required' })
      .min(1, 'RSSI must not be empty'),
    count: z
      .number({ required_error: 'Count is required' })
      .int('Count must be an integer')
      .min(1, 'Count must be at least 1'),
    timestamp: z
      .number({ required_error: 'Timestamp is required' })
      .int('Timestamp must be an integer')
      .positive('Timestamp must be positive'),
    deviceId: z
      .string({ required_error: 'Device ID is required' })
      .min(1, 'Device ID must not be empty')
      .max(100, 'Device ID must not exceed 100 characters'),
  }),
});

const sendUHFTagsBatchZodSchema = z.object({
  body: z.object({
    tags: z.array(z.object({
      epc: z
        .string({ required_error: 'EPC is required' })
        .min(1, 'EPC must not be empty')
        .max(255, 'EPC must not exceed 255 characters'),
      rssi: z
        .string({ required_error: 'RSSI is required' })
        .min(1, 'RSSI must not be empty'),
      count: z
        .number({ required_error: 'Count is required' })
        .int('Count must be an integer')
        .min(1, 'Count must be at least 1'),
      timestamp: z
        .number({ required_error: 'Timestamp is required' })
        .int('Timestamp must be an integer')
        .positive('Timestamp must be positive'),
      deviceId: z
        .string({ required_error: 'Device ID is required' })
        .min(1, 'Device ID must not be empty')
        .max(100, 'Device ID must not exceed 100 characters'),
    })).min(1, 'At least one tag is required'),
    sessionId: z
      .string({ required_error: 'Session ID is required' })
      .min(1, 'Session ID must not be empty')
      .max(100, 'Session ID must not exceed 100 characters'),
  }),
});

const getUHFTagsZodSchema = z.object({
  query: z.object({
    page: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Page must be a positive number',
      })
      .optional()
      .transform(val => val ? Number(val) : 1),
    limit: z
      .string()
      .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
        message: 'Limit must be a positive number',
      })
      .optional()
      .transform(val => val ? Number(val) : 10),
  }),
});

const deleteUHFTagZodSchema = z.object({
  params: z.object({
    epc: z
      .string({ required_error: 'EPC is required' })
      .min(1, 'EPC must not be empty')
      .max(255, 'EPC must not exceed 255 characters'),
  }),
});

export const RfidValidation = {
  createRfidTagZodSchema,
  createBulkRfidTagsZodSchema,
  checkDuplicateEpcZodSchema,
  updateRfidTagZodSchema,
  getSingleRfidTagZodSchema,
  deleteRfidTagZodSchema,
  getAllRfidTagsZodSchema,
  // UHF-specific validation schemas
  sendUHFTagZodSchema,
  sendUHFTagsBatchZodSchema,
  getUHFTagsZodSchema,
  deleteUHFTagZodSchema,
};
