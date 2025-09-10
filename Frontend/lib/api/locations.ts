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
  location_code: string;
  name: string;
  description?: string | null;
  location_type: 'warehouse' | 'room' | 'shelf' | 'bin' | string;
  parent_id?: number | null;
  status: 'active' | 'inactive' | string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  current_occupancy?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface LocationQueryParams {
  searchTerm?: string;
  location_code?: string;
  name?: string;
  location_type?: 'warehouse' | 'room' | 'shelf' | 'bin';
  parent_id?: number;
  status?: 'active' | 'inactive';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  capacity_min?: number;
  capacity_max?: number;
  current_occupancy_min?: number;
  current_occupancy_max?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateLocationData {
  location_code: string;
  name: string;
  description?: string;
  location_type: 'warehouse' | 'room' | 'shelf' | 'bin';
  parent_id?: number;
  status?: 'active' | 'inactive';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  current_occupancy?: number;
}

export interface UpdateLocationData {
  location_code?: string;
  name?: string;
  description?: string;
  location_type?: 'warehouse' | 'room' | 'shelf' | 'bin';
  parent_id?: number;
  status?: 'active' | 'inactive';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  current_occupancy?: number;
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
