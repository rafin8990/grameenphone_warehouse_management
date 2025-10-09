export type IStock = {
  id?: number;
  po_number: string;
  item_number: string;
  lot_no: string;
  quantity: number;
  created_at?: Date;
  updated_at?: Date;
  item_description?: string;
  po_date?: Date;
};

export type IStockFilters = {
  searchTerm?: string;
  po_number?: string;
  item_number?: string;
  lot_no?: string;
};

export type IStockUpdate = {
  po_number: string;
  item_number: string;
  lot_no: string;
  quantity: number;
};

export type IStockStats = {
  total_items: number;
  total_quantity: number;
  unique_items: number;
  unique_pos: number;
  recent_updates: number;
};

export type IStockSummary = {
  item_number: string;
  item_description: string;
  total_quantity: number;
  lot_count: number;
  po_count: number;
  last_updated: Date;
};
