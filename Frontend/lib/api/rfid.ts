import axios from '../axios';

export interface IRfidTag {
  id?: number;
  tag_uid: string;
  status: 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged';
  created_at?: Date;
  updated_at?: Date;
}

export interface RfidQueryParams {
  searchTerm?: string;
  tag_uid?: string;
  status?: 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RfidResponse {
  success: boolean;
  message: string;
  data: IRfidTag[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleRfidResponse {
  success: boolean;
  message: string;
  data: IRfidTag;
}

export const rfidApi = {
  // Get all RFID tags with pagination and filters
  getAll: async (params?: RfidQueryParams): Promise<RfidResponse> => {
    const response = await axios.get('/rfid', { params });
    return response.data;
  },

  // Get single RFID tag by ID
  getById: async (id: number): Promise<SingleRfidResponse> => {
    const response = await axios.get(`/rfid/${id}`);
    return response.data;
  },

  // Create new RFID tag
  create: async (data: Omit<IRfidTag, 'id' | 'created_at' | 'updated_at'>): Promise<SingleRfidResponse> => {
    const response = await axios.post('/rfid', data);
    return response.data;
  },

  // Update RFID tag
  update: async (id: number, data: Partial<Omit<IRfidTag, 'id' | 'created_at' | 'updated_at'>>): Promise<SingleRfidResponse> => {
    const response = await axios.patch(`/rfid/${id}`, data);
    return response.data;
  },

  // Delete RFID tag
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`/rfid/${id}`);
    return response.data;
  },
};