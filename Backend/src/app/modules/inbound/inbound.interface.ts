export type IInboundItem = {
  item_number: string;
  item_description: string;
  lot_no: string;
  quantity: number;
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
};

export type IInboundFilters = {
  searchTerm?: string;
  po_number?: string;
  received_at?: string;
};

