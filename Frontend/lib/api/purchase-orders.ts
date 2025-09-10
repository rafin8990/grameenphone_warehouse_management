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

export interface IPurchaseOrder {
  id?: number;
  po_number: string;
  vendor_id: number;
  vendor_name?: string;
  vendor_code?: string;
  total_amount?: number;
  requisition_id?: number;
  status: 'pending' | 'received' | 'cancelled' | string;
  created_at?: Date;
  updated_at?: Date;
}

export interface IPoItem {
  id?: number;
  po_id?: number;
  item_id: number;
  item_code?: string;
  item_description?: string;
  uom_primary?: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
}

export interface IPoItemWithRfid extends IPoItem {
  rfid_tags?: {
    po_item_id?: number;
    rfid_id: number;
    tag_uid?: string;
    rfid_status?: string;
    quantity: number;
  }[];
}

export interface IPurchaseOrderWithItems extends IPurchaseOrder {
  items: IPoItemWithRfid[];
}

export interface PurchaseOrderQueryParams {
  searchTerm?: string;
  po_number?: string;
  vendor_id?: number;
  status?: 'pending' | 'received' | 'cancelled';
  requisition_id?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePurchaseOrderData {
  po_number: string;
  vendor_id: number;
  total_amount?: number;
  requisition_id?: number;
  status?: 'pending' | 'received' | 'cancelled';
  items: Omit<IPoItemWithRfid, 'id' | 'po_id'>[];
}

export interface UpdatePurchaseOrderData {
  po_number?: string;
  vendor_id?: number;
  total_amount?: number;
  requisition_id?: number;
  status?: 'pending' | 'received' | 'cancelled';
  items?: Omit<IPoItemWithRfid, 'id' | 'po_id'>[];
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

  // Create new purchase order
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

  // Update purchase order
  update: async (id: number, data: UpdatePurchaseOrderData): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/${id}`, {
        method: 'PUT',
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

  // Get purchase orders by status
  getByStatus: async (status: string): Promise<IPurchaseOrderWithItems[]> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase orders by status:', error);
      throw error;
    }
  },

  // Get purchase orders by vendor
  getByVendor: async (vendorId: number): Promise<IPurchaseOrderWithItems[]> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/vendor/${vendorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase orders by vendor:', error);
      throw error;
    }
  },

  // Mark purchase order as received
  markAsReceived: async (id: number): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/${id}/receive`, {
        method: 'POST',
      });
      return response.data;
    } catch (error) {
      console.error('Error marking purchase order as received:', error);
      throw error;
    }
  },

  // Cancel purchase order
  cancel: async (id: number, reason?: string): Promise<IPurchaseOrderWithItems> => {
    try {
      const response = await apiRequest(`/api/v1/purchase-orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      throw error;
    }
  }
};

// Legacy function names for backward compatibility
export const getAllPurchaseOrders = purchaseOrdersApi.getAll;
export const getPurchaseOrderById = purchaseOrdersApi.getById;
export const createPurchaseOrder = purchaseOrdersApi.create;
export const updatePurchaseOrder = purchaseOrdersApi.update;
export const deletePurchaseOrder = purchaseOrdersApi.delete;
