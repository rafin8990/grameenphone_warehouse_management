import { z } from 'zod';

const createLocationTrackerZodSchema = z.object({
  body: z.object({
    location_code: z.string({
      required_error: 'Location code is required',
    }).min(1, 'Location code cannot be empty'),
    po_number: z.string({
      required_error: 'PO number is required',
    }).min(1, 'PO number cannot be empty'),
    item_number: z.string({
      required_error: 'Item number is required',
    }).min(1, 'Item number cannot be empty'),
    quantity: z.number({
      required_error: 'Quantity is required',
    }).min(1, 'Quantity must be at least 1'),
    status: z.enum(['in', 'out'], {
      required_error: 'Status is required',
    }),
  }),
});

const getLocationTrackersZodSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    searchTerm: z.string().optional(),
    location_code: z.string().optional(),
    po_number: z.string().optional(),
    item_number: z.string().optional(),
    status: z.enum(['in', 'out']).optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
  }),
});

// Location tracker scan validation schema
const processLocationScanZodSchema = z.object({
  body: z.object({
    epc: z
      .string({
        required_error: 'EPC is required',
      })
      .min(1, 'EPC must not be empty'),
    deviceId: z
      .string({
        required_error: 'Device ID is required',
      })
      .min(1, 'Device ID must not be empty'),
    rssi: z.string().optional(),
    count: z.number().optional(),
    timestamp: z.number().optional(),
  }),
});

export const LocationTrackerValidation = {
  createLocationTrackerZodSchema,
  getLocationTrackersZodSchema,
  processLocationScanZodSchema,
};
