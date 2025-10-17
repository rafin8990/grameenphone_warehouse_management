export type IEpcTracking = {
  id?: number;
  epc: string;
  item_number: string;
  po_number: string;
  quantity: number;
  created_at?: Date;
  updated_at?: Date;
};

export type IEpcTrackingFilters = {
  epc?: string;
  item_number?: string;
  po_number?: string;
};
