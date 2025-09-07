import axios from '../axios';

export interface IPurchaseOrder {
  id?: number;
  po_number: string;
  vendor_id: number;
  total_amount?: number | null;
  requisition_id?: number | null;
  status: 'pending' | 'received';
  created_at?: Date;
  updated_at?: Date;
  vendor_name?: string;
  vendor_code?: string;
}

export interface IPoItem {
  id?: number;
  po_id: number;
  item_id: number;
  quantity: number;
  unit: string;
  item_code?: string;
  item_description?: string;
  uom_primary?: string;
}

export interface IPoItemRfid {
  id?: number;
  po_item_id: number;
  rfid_id: number;
  quantity: number;
  tag_uid?: string;
  rfid_status?: string;
}

export interface IPoItemWithRfid extends IPoItem {
  rfid_tags?: IPoItemRfid[];
}

export interface IPurchaseOrderComplete extends IPurchaseOrder {
  items?: IPoItemWithRfid[];
}

export interface IPurchaseOrderFilters {
  searchTerm?: string;
  po_number?: string;
  vendor_id?: number;
  status?: string;
  requisition_id?: number;
  created_at_from?: string;
  created_at_to?: string;
  updated_at_from?: string;
  updated_at_to?: string;
}

export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPurchaseOrderResponse {
  data: IPurchaseOrderComplete[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Create Purchase Order
export const createPurchaseOrder = async (data: Partial<IPurchaseOrderComplete>): Promise<IPurchaseOrderComplete> => {
  const response = await axios.post('/purchase-orders', data);
  return response.data.data;
};

// Get All Purchase Orders
export const getAllPurchaseOrders = async (
  filters?: IPurchaseOrderFilters,
  pagination?: IPaginationOptions
): Promise<IPurchaseOrderResponse> => {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
  }
  
  if (pagination) {
    Object.entries(pagination).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await axios.get(`/purchase-orders?${params.toString()}`);
  return response.data;
};

// Get Single Purchase Order
export const getSinglePurchaseOrder = async (id: number): Promise<IPurchaseOrderComplete> => {
  const response = await axios.get(`/purchase-orders/${id}`);
  return response.data.data;
};

// Update Purchase Order
export const updatePurchaseOrder = async (id: number, data: Partial<IPurchaseOrderComplete>): Promise<IPurchaseOrderComplete> => {
  const response = await axios.patch(`/purchase-orders/${id}`, data);
  return response.data.data;
};

// Delete Purchase Order
export const deletePurchaseOrder = async (id: number): Promise<void> => {
  await axios.delete(`/purchase-orders/${id}`);
};
