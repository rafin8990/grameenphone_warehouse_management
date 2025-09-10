// Using fetch instead of axios for simplicity
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

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

export interface CreateItemData {
  item_code: string;
  item_description?: string;
  item_status?: 'active' | 'inactive' | 'obsolete';
  org_code?: string;
  category_id?: number;
  capex_opex?: 'CAPEX' | 'OPEX';
  tracking_method: 'NONE' | 'SERIAL' | 'LOT';
  uom_primary: string;
  uom_secondary?: string;
  conversion_to_primary?: number;
  brand?: string;
  model?: string;
  manufacturer?: string;
  hsn_code?: string;
  barcode_upc?: string;
  barcode_ean?: string;
  gs1_gtin?: string;
  rfid_supported?: boolean;
  default_location_id?: number;
  min_qty?: number;
  max_qty?: number;
  unit_weight_kg?: number;
  unit_length_cm?: number;
  unit_width_cm?: number;
  unit_height_cm?: number;
  fusion_item_id?: string;
  fusion_category?: string;
}

export interface UpdateItemData {
  item_code?: string;
  item_description?: string;
  item_status?: 'active' | 'inactive' | 'obsolete';
  org_code?: string;
  category_id?: number;
  capex_opex?: 'CAPEX' | 'OPEX';
  tracking_method?: 'NONE' | 'SERIAL' | 'LOT';
  uom_primary?: string;
  uom_secondary?: string;
  conversion_to_primary?: number;
  brand?: string;
  model?: string;
  manufacturer?: string;
  hsn_code?: string;
  barcode_upc?: string;
  barcode_ean?: string;
  gs1_gtin?: string;
  rfid_supported?: boolean;
  default_location_id?: number;
  min_qty?: number;
  max_qty?: number;
  unit_weight_kg?: number;
  unit_length_cm?: number;
  unit_width_cm?: number;
  unit_height_cm?: number;
  fusion_item_id?: string;
  fusion_category?: string;
}

export interface ItemResponse {
  data: IItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const itemsApi = {
  // Get all items with pagination and filtering
  getAll: async (params: ItemQueryParams = {}): Promise<ItemResponse> => {
    try {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, value.toString());
        }
      });
      const endpoint = `/api/v1/items${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      const response = await apiRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  },

  // Get single item by ID
  getById: async (id: number): Promise<IItem> => {
    try {
      const response = await apiRequest(`/api/v1/items/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching item:', error);
      throw error;
    }
  },

  // Create new item
  create: async (data: CreateItemData): Promise<IItem> => {
    try {
      const response = await apiRequest('/api/v1/items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  },

  // Update item
  update: async (id: number, data: UpdateItemData): Promise<IItem> => {
    try {
      const response = await apiRequest(`/api/v1/items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  // Delete item
  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/v1/items/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },

  // Get items by status
  getByStatus: async (status: string): Promise<IItem[]> => {
    try {
      const response = await apiRequest(`/api/v1/items/status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching items by status:', error);
      throw error;
    }
  },

  // Get items by category
  getByCategory: async (categoryId: number): Promise<IItem[]> => {
    try {
      const response = await apiRequest(`/api/v1/items/category/${categoryId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching items by category:', error);
      throw error;
    }
  }
};
