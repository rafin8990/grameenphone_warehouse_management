export type IInboundItem = {
  item_number: string;
  item_description: string;
  lot_no?: string;
  quantity: number; // Received quantity
  ordered_quantity: number; // Ordered quantity from PO
  epc?: string; // EPC for duplicate checking
};

export type IInbound = {
  id?: number;
  po_number: string;
  items: IInboundItem[]; // JSONB array
  received_at: Date | string;
  created_at?: Date;
  updated_at?: Date;
};

export type IRfidScanData = {
  epc: string;
  rssi?: string;
  count?: number;
  timestamp?: number;
  deviceId?: string;
  value?: number; // user_id from the payload
};

export type IInboundFilters = {
  searchTerm?: string;
  po_number?: string;
  received_at?: string;
};

