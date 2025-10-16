export type IPurchaseOrder = {
  id?: number;
  po_number: string;
  po_description?: string | null;
  supplier_name: string;
  po_type?: string | null;
  status?: 'pending' | 'partial' | 'received' | 'cancelled';
  created_at?: Date;
  updated_at?: Date;
  received_at?: Date | null;
};

export type IPoItem = {
  id?: number;
  po_id?: number;
  item_number: string;
  quantity: number;
  created_at?: Date;
  updated_at?: Date;
};

// Extended interface for purchase order with items
export type IPurchaseOrderWithItems = IPurchaseOrder & {
  items?: IPoItem[];
  total_items?: number;
  total_ordered_quantity?: number;
  total_received_quantity?: number;
};

// Interface for creating purchase order with items
export type ICreatePurchaseOrder = {
  po_number: string;
  po_description?: string | null;
  supplier_name: string;
  po_type?: string | null;
  po_items?: Omit<IPoItem, 'id' | 'po_id' | 'created_at' | 'updated_at'>[];
};

// Interface for updating purchase order
export type IUpdatePurchaseOrder = {
  po_number?: string;
  po_description?: string | null;
  supplier_name?: string;
  po_type?: string | null;
  po_items?: Omit<IPoItem, 'id' | 'po_id' | 'created_at' | 'updated_at'>[];
};

export type IPurchaseOrderFilters = {
  searchTerm?: string;
  po_number?: string;
  supplier_name?: string;
  po_type?: string;
};
