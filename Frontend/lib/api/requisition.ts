import axios from '../axios';

export interface IRequisition {
  id?: number;
  requisition_number: string;
  requester_name?: string | null;
  organization_code?: string | null;
  status: 'open' | 'approved' | 'rejected' | 'closed' | string;
  requirement?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IRequisitionItem {
  id?: number;
  requisition_id: number;
  item_id: number;
  quantity: number;
  uom?: string | null;
  remarks?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface IRequisitionWithItems extends IRequisition {
  items?: IRequisitionItemWithItemDetails[];
}

export interface IRequisitionItemWithItemDetails extends IRequisitionItem {
  item?: {
    id: number;
    item_code: string;
    item_description?: string | null;
    item_status: 'active' | 'inactive' | 'obsolete' | string;
    org_code?: string | null;
    category_id?: number | null;
    capex_opex?: 'CAPEX' | 'OPEX' | null;
    tracking_method: 'NONE' | 'SERIAL' | 'LOT' | string;
    uom_primary: string;
    uom_secondary?: string | null;
    conversion_to_primary?: number | null;
    brand?: string | null;
    model?: string | null;
    manufacturer?: string | null;
    hsn_code?: string | null;
    barcode_upc?: string | null;
    barcode_ean?: string | null;
    gs1_gtin?: string | null;
    rfid_supported?: boolean | null;
    default_location_id?: number | null;
    min_qty?: number | null;
    max_qty?: number | null;
    unit_weight_kg?: number | null;
    unit_length_cm?: number | null;
    unit_width_cm?: number | null;
    unit_height_cm?: number | null;
    images?: string[] | null;
    specs?: Record<string, any> | null;
    attributes?: Record<string, any> | null;
    fusion_item_id?: string | null;
    fusion_category?: string | null;
    created_at?: Date;
    updated_at?: Date;
  };
}

export interface IRequisitionFilters {
  searchTerm?: string;
  requisition_number?: string;
  requester_name?: string;
  organization_code?: string;
  status?: string;
  requirement?: string;
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

export interface IRequisitionResponse {
  data: IRequisitionWithItems[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Create Requisition
export const createRequisition = async (data: Partial<IRequisition>): Promise<IRequisitionWithItems> => {
  const response = await axios.post('/requisitions', data);
  return response.data.data;
};

// Get All Requisitions
export const getAllRequisitions = async (
  filters?: IRequisitionFilters,
  pagination?: IPaginationOptions
): Promise<IRequisitionResponse> => {
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
  
  const response = await axios.get(`/requisitions?${params.toString()}`);
  return response.data;
};

// Get Single Requisition
export const getSingleRequisition = async (id: number): Promise<IRequisitionWithItems> => {
  const response = await axios.get(`/requisitions/${id}`);
  return response.data.data;
};

// Update Requisition
export const updateRequisition = async (id: number, data: Partial<IRequisition>): Promise<IRequisitionWithItems> => {
  const response = await axios.patch(`/requisitions/${id}`, data);
  return response.data.data;
};

// Delete Requisition
export const deleteRequisition = async (id: number): Promise<void> => {
  await axios.delete(`/requisitions/${id}`);
};

// Add Requisition Item
export const addRequisitionItem = async (requisitionId: number, data: Partial<IRequisitionItem>): Promise<IRequisitionItem> => {
  const response = await axios.post(`/requisitions/${requisitionId}/items`, data);
  return response.data.data;
};

// Update Requisition Item
export const updateRequisitionItem = async (id: number, data: Partial<IRequisitionItem>): Promise<IRequisitionItem> => {
  const response = await axios.patch(`/requisitions/items/${id}`, data);
  return response.data.data;
};

// Delete Requisition Item
export const deleteRequisitionItem = async (id: number): Promise<void> => {
  await axios.delete(`/requisitions/items/${id}`);
};

// Get Single Requisition Item
export const getSingleRequisitionItem = async (id: number): Promise<any> => {
  const response = await axios.get(`/requisitions/items/${id}`);
  return response.data.data;
};
