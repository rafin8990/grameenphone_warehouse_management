import axios from '../axios';

export interface ILocation {
  id?: number;
  sub_inventory_code: string;
  locator_code: string;
  name?: string | null;
  description?: string | null;
  org_code?: string | null;
  status: 'active' | 'inactive' | 'obsolete' | string;
  capacity?: number | null;
  attributes?: Record<string, any> | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface LocationQueryParams {
  searchTerm?: string;
  sub_inventory_code?: string;
  locator_code?: string;
  name?: string;
  org_code?: string;
  status?: 'active' | 'inactive' | 'obsolete';
  capacity_min?: number;
  capacity_max?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LocationResponse {
  success: boolean;
  message: string;
  data: ILocation[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleLocationResponse {
  success: boolean;
  message: string;
  data: ILocation;
}

export const locationApi = {
  // Get all locations with pagination and filters
  getAll: async (params?: LocationQueryParams): Promise<LocationResponse> => {
    const response = await axios.get('/locations', { params });
    return response.data;
  },

  // Get single location by ID
  getById: async (id: number): Promise<SingleLocationResponse> => {
    const response = await axios.get(`/locations/${id}`);
    return response.data;
  },

  // Create new location
  create: async (data: Omit<ILocation, 'id' | 'created_at' | 'updated_at'>): Promise<SingleLocationResponse> => {
    const response = await axios.post('/locations', data);
    return response.data;
  },

  // Update location
  update: async (id: number, data: Partial<Omit<ILocation, 'id' | 'created_at' | 'updated_at'>>): Promise<SingleLocationResponse> => {
    const response = await axios.patch(`/locations/${id}`, data);
    return response.data;
  },

  // Delete location
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`/locations/${id}`);
    return response.data;
  },
};
