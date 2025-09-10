import { z } from 'zod';

const createStockBalanceZodSchema = z.object({
  body: z.object({
    item_id: z.number({
      required_error: 'Item ID is required',
    }),
    location_id: z.number({
      required_error: 'Location ID is required',
    }),
    on_hand_qty: z.number({
      required_error: 'On hand quantity is required',
    }).min(0, 'On hand quantity must be non-negative'),
  }),
});

const updateStockBalanceZodSchema = z.object({
  body: z.object({
    on_hand_qty: z.number({
      required_error: 'On hand quantity is required',
    }).min(0, 'On hand quantity must be non-negative'),
  }),
});

const getStockBalanceZodSchema = z.object({
  query: z.object({
    item_id: z.string().optional(),
    location_id: z.string().optional(),
    searchTerm: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const getSingleStockBalanceZodSchema = z.object({
  params: z.object({
    id: z.string({
      required_error: 'Stock balance ID is required',
    }),
  }),
});

const deleteStockBalanceZodSchema = z.object({
  params: z.object({
    id: z.string({
      required_error: 'Stock balance ID is required',
    }),
  }),
});

export const StockBalanceValidation = {
  createStockBalanceZodSchema,
  updateStockBalanceZodSchema,
  getStockBalanceZodSchema,
  getSingleStockBalanceZodSchema,
  deleteStockBalanceZodSchema,
};
