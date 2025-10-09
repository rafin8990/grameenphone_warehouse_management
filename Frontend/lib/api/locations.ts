import axiosInstance from '../axios';

export interface ILocation {
  id: number;
  location_name: string;
  location_code: string;
  sub_inventory_code?: string;
  created_at: string;
  updated_at: string;
}

export interface ICreateLocation {
  location_name: string;
  location_code: string;
  sub_inventory_code?: string;
}

export interface IUpdateLocation {
  location_name?: string;
  location_code?: string;
  sub_inventory_code?: string;
}

export interface ILocationFilters {
  searchTerm?: string;
  location_name?: string;
  location_code?: string;
  sub_inventory_code?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ILocationResponse {
  success: boolean;
  message: string;
  data: ILocation[];
}

export interface ILocationStats {
  total: number;
  recent: number;
}

export const locationsApi = {
  // Get all locations with filters and pagination
  getLocations: async (filters: ILocationFilters = {}): Promise<ILocationResponse> => {
    console.log('locationsApi.getLocations called with filters:', filters);
    console.log('axiosInstance baseURL:', axiosInstance.defaults.baseURL);
    const response = await axiosInstance.get('/locations', { params: filters });
    return response.data;
  },

  // Get single location by ID
  getLocation: async (id: number): Promise<{ success: boolean; message: string; data: ILocation }> => {
    const response = await axiosInstance.get(`/locations/${id}`);
    return response.data;
  },

  // Create new location
  createLocation: async (data: ICreateLocation): Promise<{ success: boolean; message: string; data: ILocation }> => {
    console.log('locationsApi.createLocation called with data:', data);
    console.log('axiosInstance baseURL:', axiosInstance.defaults.baseURL);
    const response = await axiosInstance.post('/locations', data);
    return response.data;
  },

  // Update location
  updateLocation: async (id: number, data: IUpdateLocation): Promise<{ success: boolean; message: string; data: ILocation }> => {
    const response = await axiosInstance.patch(`/locations/${id}`, data);
    return response.data;
  },

  // Delete location
  deleteLocation: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await axiosInstance.delete(`/locations/${id}`);
    return response.data;
  },

  // Get location statistics
  getLocationStats: async (): Promise<{ success: boolean; message: string; data: ILocationStats }> => {
    const response = await axiosInstance.get('/locations/stats');
    return response.data;
  },
};