export interface IStockBalance {
  id?: number;
  item_id: number;
  location_id: number;
  on_hand_qty: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface IStockBalanceWithDetails extends IStockBalance {
  item?: {
    id: number;
    item_code: string;
    item_description?: string | null;
  };
  location?: {
    id: number;
    sub_inventory_code: string;
    locator_code: string;
    name?: string | null;
  };
}

export interface IStockBalanceWithLocation extends IStockBalance {
  location?: {
    id: number;
    sub_inventory_code: string;
    locator_code: string;
    name?: string | null;
  };
}

export interface CreateStockBalanceData {
  item_id: number;
  location_id: number;
  on_hand_qty: number;
}

export interface UpdateStockBalanceData {
  on_hand_qty?: number;
}

export interface StockBalanceQueryParams {
  item_id?: number;
  location_id?: number;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
