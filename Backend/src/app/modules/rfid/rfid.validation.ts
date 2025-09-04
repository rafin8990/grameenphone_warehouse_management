import { z } from 'zod';

// Create RFID tag validation schema
const createRfidTagZodSchema = z.object({
  body: z.object({
    tag_uid: z
      .string({
        required_error: 'Tag UID is required',
      })
      .min(1, 'Tag UID must not be empty')
      .max(64, 'Tag UID must not exceed 64 characters'),
    status: z
      .enum(['available', 'reserved', 'assigned', 'consumed', 'lost', 'damaged'], {
        errorMap: () => ({
          message: 'Status must be one of: available, reserved, assigned, consumed, lost, damaged',
        }),
      })
      .default('available'),
  }),
});

// Update RFID tag validation schema
const updateRfidTagZodSchema = z.object({
  body: z.object({
    tag_uid: z
      .string()
      .min(1, 'Tag UID must not be empty')
      .max(64, 'Tag UID must not exceed 64 characters')
      .optional(),
    status: z
      .enum(['available', 'reserved', 'assigned', 'consumed', 'lost', 'damaged'], {
        errorMap: () => ({
          message: 'Status must be one of: available, reserved, assigned, consumed, lost, damaged',
        }),
      })
      .optional(),
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
    tag_uid: z.string().optional(),
    status: z
      .enum(['available', 'reserved', 'assigned', 'consumed', 'lost', 'damaged'])
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

export const RfidValidation = {
  createRfidTagZodSchema,
  updateRfidTagZodSchema,
  getSingleRfidTagZodSchema,
  deleteRfidTagZodSchema,
  getAllRfidTagsZodSchema,
};
