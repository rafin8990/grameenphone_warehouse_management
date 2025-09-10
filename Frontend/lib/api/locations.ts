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

export interface CreateLocationData {
  sub_inventory_code: string;
  locator_code: string;
  name?: string;
  description?: string;
  org_code?: string;
  status?: 'active' | 'inactive' | 'obsolete';
  capacity?: number;
  attributes?: Record<string, any>;
}

export interface UpdateLocationData {
  sub_inventory_code?: string;
  locator_code?: string;
  name?: string;
  description?: string;
  org_code?: string;
  status?: 'active' | 'inactive' | 'obsolete';
  capacity?: number;
  attributes?: Record<string, any>;
}

export interface LocationResponse {
  data: ILocation[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const locationsApi = {
  // Get all locations with pagination and filtering
  getAll: async (params: LocationQueryParams = {}): Promise<LocationResponse> => {
    try {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, value.toString());
        }
      });
      const endpoint = `/api/v1/locations${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      const response = await apiRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  },

  // Get single location by ID
  getById: async (id: number): Promise<ILocation> => {
    try {
      const response = await apiRequest(`/api/v1/locations/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching location:', error);
      throw error;
    }
  },

  // Create new location
  create: async (data: CreateLocationData): Promise<ILocation> => {
    try {
      const response = await apiRequest('/api/v1/locations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  },

  // Update location
  update: async (id: number, data: UpdateLocationData): Promise<ILocation> => {
    try {
      const response = await apiRequest(`/api/v1/locations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  },

  // Delete location
  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/v1/locations/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  },

  // Get locations by status
  getByStatus: async (status: string): Promise<ILocation[]> => {
    try {
      const response = await apiRequest(`/api/v1/locations/status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching locations by status:', error);
      throw error;
    }
  },

  // Get locations by type
  getByType: async (type: string): Promise<ILocation[]> => {
    try {
      const response = await apiRequest(`/api/v1/locations/type/${type}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching locations by type:', error);
      throw error;
    }
  },

  // Get child locations
  getChildren: async (parentId: number): Promise<ILocation[]> => {
    try {
      const response = await apiRequest(`/api/v1/locations/parent/${parentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching child locations:', error);
      throw error;
    }
  }
};
