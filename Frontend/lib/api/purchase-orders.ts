// API for Purchase Orders - New Simplified Structure
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
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export interface IPurchaseOrder {
  id?: number;
  po_number: string;
  po_description?: string | null;
  supplier_name: string;
  po_type?: string | null;
  status?: 'pending' | 'partial' | 'received' | 'cancelled';
  created_at?: Date;
  updated_at?: Date;
  received_at?: Date | null;
}

export interface IPoItem {
  id?: number;
  po_id?: number;
  item_number: string;
  item_code?: string;
  item_description?: string;
  item_type?: string;
  primary_uom?: string;
  uom_code?: string;
  item_status?: string;
  quantity: number;
  ordered_quantity?: number;
  received_quantity?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface IPurchaseOrderWithItems extends IPurchaseOrder {
  items?: IPoItem[];
  total_items?: number;
  total_ordered_quantity?: number;
  total_received_quantity?: number;
  status?: 'pending' | 'partial' | 'received' | 'cancelled';
  received_at?: Date | null;
}

export interface PurchaseOrderQueryParams {
  searchTerm?: string;
  po_number?: string;
  supplier_name?: string;
  po_type?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePurchaseOrderData {
  po_number: string;
  po_description?: string;
  supplier_name: string;
  po_type?: string;
  po_items: {
    item_number: string;
    quantity: number;
  }[];
}

export interface UpdatePurchaseOrderData {
  po_number?: string;
  po_description?: string;
  supplier_name?: string;
  po_type?: string;
  po_items?: {
    item_number: string;
    quantity: number;
  }[];
}

export interface PurchaseOrderResponse {
  data: IPurchaseOrderWithItems[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const purchaseOrdersApi = {
  // Get all purchase orders with pagination and filtering
  getAll: async (params: PurchaseOrderQueryParams = {}): Promise<PurchaseOrderResponse> => {
    try {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, value.toString());
        }
      });
      const endpoint = `/api/v1/purchase-orders${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      const response = await apiRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  // Get single purchase order by ID
  getById: async (id: number): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      throw error;
    }
  },

  // Create new purchase order (regular endpoint)
  create: async (data: CreatePurchaseOrderData): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest('/api/v1/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  },

  // Quick generate purchase order (no data needed - uses fixed data)
  quickGenerate: async (): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest('/api/v1/purchase-orders/quick-generate', {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('Error quick-generating purchase order:', error);
      throw error;
    }
  },

  // Auto-create purchase order (can auto-generate PO number)
  autoCreate: async (data: Partial<CreatePurchaseOrderData>): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest('/api/v1/purchase-orders/auto-generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error auto-creating purchase order:', error);
      throw error;
    }
  },

  // Update purchase order
  update: async (id: number, data: UpdatePurchaseOrderData): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  },

  // Delete purchase order
  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/v1/purchase-orders/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  },

  // Send purchase order to Fusion
  sendToFusion: async (id: number): Promise<{ message: string; fusion_id?: string }> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/${id}/send-to-fusion`, {
        method: 'POST',
      });
      return response;
    } catch (error) {
      console.error('Error sending purchase order to Fusion:', error);
      throw error;
    }
  },

  // Update purchase order status
  updateStatus: async (id: number, status: 'received' | 'partial' | 'cancelled'): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating purchase order status:', error);
      throw error;
    }
  },
};
