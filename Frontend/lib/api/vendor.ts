import axios from '../axios';

export interface IVendor {
  id?: number;
  vendor_code: string;
  name: string;
  short_name?: string | null;
  status: 'active' | 'inactive' | 'obsolete' | string;
  org_code?: string | null;
  fusion_vendor_id?: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  payment_terms?: string | null;
  currency?: string | null;
  credit_limit?: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IVendorAddress {
  id?: number;
  vendor_id: number;
  type: 'billing' | 'shipping' | 'head' | 'other' | string;
  line1: string;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country: string;
  is_default?: boolean | null;
  attributes?: Record<string, any> | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IVendorWithAddresses extends IVendor {
  addresses?: IVendorAddress[];
}

export interface VendorQueryParams {
  searchTerm?: string;
  vendor_code?: string;
  name?: string;
  short_name?: string;
  org_code?: string;
  status?: 'active' | 'inactive' | 'obsolete';
  fusion_vendor_id?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  website?: string;
  payment_terms?: string;
  currency?: string;
  credit_limit_min?: number;
  credit_limit_max?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface VendorResponse {
  success: boolean;
  message: string;
  data: IVendor[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleVendorResponse {
  success: boolean;
  message: string;
  data: IVendor;
}

export const vendorApi = {
  // Get all vendors with pagination and filters
  getAll: async (params?: VendorQueryParams): Promise<VendorResponse> => {
    const response = await axios.get('/vendors', { params });
    return response.data;
  },

  // Get single vendor by ID
  getById: async (id: number): Promise<SingleVendorResponse> => {
    const response = await axios.get(`/vendors/${id}`);
    return response.data;
  },

  // Create new vendor
  create: async (data: Omit<IVendor, 'id' | 'created_at' | 'updated_at'>): Promise<SingleVendorResponse> => {
    const response = await axios.post('/vendors', data);
    return response.data;
  },

  // Update vendor
  update: async (id: number, data: Partial<Omit<IVendor, 'id' | 'created_at' | 'updated_at'>>): Promise<SingleVendorResponse> => {
    const response = await axios.patch(`/vendors/${id}`, data);
    return response.data;
  },

  // Delete vendor
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`/vendors/${id}`);
    return response.data;
  },
};