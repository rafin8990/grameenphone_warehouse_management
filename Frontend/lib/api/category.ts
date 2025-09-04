import axios from '../axios';

export interface ICategory {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  parent_id?: number | null;
  status: 'active' | 'inactive' | string;
  fusion_category_code?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CategoryQueryParams {
  searchTerm?: string;
  code?: string;
  name?: string;
  parent_id?: number;
  status?: 'active' | 'inactive';
  fusion_category_code?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CategoryResponse {
  success: boolean;
  message: string;
  data: ICategory[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SingleCategoryResponse {
  success: boolean;
  message: string;
  data: ICategory;
}

export const categoryApi = {
  // Get all categories with pagination and filters
  getAll: async (params?: CategoryQueryParams): Promise<CategoryResponse> => {
    const response = await axios.get('/categories', { params });
    return response.data;
  },

  // Get single category by ID
  getById: async (id: number): Promise<SingleCategoryResponse> => {
    const response = await axios.get(`/categories/${id}`);
    return response.data;
  },

  // Create new category
  create: async (data: Omit<ICategory, 'id' | 'created_at' | 'updated_at'>): Promise<SingleCategoryResponse> => {
    const response = await axios.post('/categories', data);
    return response.data;
  },

  // Update category
  update: async (id: number, data: Partial<Omit<ICategory, 'id' | 'created_at' | 'updated_at'>>): Promise<SingleCategoryResponse> => {
    const response = await axios.patch(`/categories/${id}`, data);
    return response.data;
  },

  // Delete category
  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`/categories/${id}`);
    return response.data;
  },
};
