import axios from '../axios';

export interface IItem {
  id?: number;
  item_code: string;
  item_description?: string | null;
  item_status: 'active' | 'inactive' | 'obsolete' | string;
  org_code?: string | null;
  category_id?: number | null;
  capex_opex?: 'CAPEX' | 'OPEX' | null;
  tracking_method: 'NONE' | 'SERIAL' | 'LOT' | string;
  uom_primary: string;
  uom_secondary?: string | null;
  conversion_to_primary?: number | null;
  brand?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  hsn_code?: string | null;
  barcode_upc?: string | null;
  barcode_ean?: string | null;
  gs1_gtin?: string | null;
  rfid_supported?: boolean | null;
  default_location_id?: number | null;
  min_qty?: number | null;
  max_qty?: number | null;
  unit_weight_kg?: number | null;
  unit_length_cm?: number | null;
  unit_width_cm?: number | null;
  unit_height_cm?: number | null;
  images?: string[] | null;
  specs?: Record<string, any> | null;
  attributes?: Record<string, any> | null;
  fusion_item_id?: string | null;
  fusion_category?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface ItemQueryParams {
  searchTerm?: string;
  item_code?: string;
  item_description?: string;
  org_code?: string;
  category_id?: number;
  item_status?: 'active' | 'inactive' | 'obsolete';
  capex_opex?: 'CAPEX' | 'OPEX';
  tracking_method?: 'NONE' | 'SERIAL' | 'LOT';
  brand?: string;
  model?: string;
  manufacturer?: string;
  hsn_code?: string;
  barcode_upc?: string;
  barcode_ean?: string;
  gs1_gtin?: string;
  rfid_supported?: boolean;
  default_location_id?: number;
  min_qty_min?: number;
  min_qty_max?: number;
  max_qty_min?: number;
  max_qty_max?: number;
  unit_weight_min?: number;
  unit_weight_max?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ItemResponse {
  success: boolean;
  message: string;
  data: IItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleItemResponse {
  success: boolean;
  message: string;
  data: IItem;
}

export const itemApi = {
  // Get all items with pagination and filters
  getAll: async (params?: ItemQueryParams): Promise<ItemResponse> => {
    const response = await axios.get('/items', { params });
    return response.data;
  },

  // Get single item by ID
  getById: async (id: number): Promise<SingleItemResponse> => {
    const response = await axios.get(`/items/${id}`);
    return response.data;
  },

  // Create new item
  create: async (data: Omit<IItem, 'id' | 'created_at' | 'updated_at'>): Promise<SingleItemResponse> => {
    const response = await axios.post('/items', data);
    return response.data;
  },

  // Update item
  update: async (id: number, data: Partial<Omit<IItem, 'id' | 'created_at' | 'updated_at'>>): Promise<SingleItemResponse> => {
    const response = await axios.patch(`/items/${id}`, data);
    return response.data;
  },

  // Delete item
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`/items/${id}`);
    return response.data;
  },
};
