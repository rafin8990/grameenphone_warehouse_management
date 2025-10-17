export type ILocationTracker = {
  id?: number;
  po_number: string;
  item_number: string;
  quantity: number;
  status: 'in' | 'out';
  epc?: string;
  user_id?: number;
  created_at?: Date;
  updated_at?: Date;
  location_name?: string;
};

export type ILocationTrackerFilters = {
  searchTerm?: string;
  po_number?: string;
  item_number?: string;
  status?: 'in' | 'out';
  epc?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  fromDate?: string;
  toDate?: string;
};

export type ICreateLocationTracker = Omit<ILocationTracker, 'id' | 'created_at' | 'updated_at'>;

export type ILocationTrackerStats = {
  total_trackers: number;
  current_in: number;
  current_out: number;
  recent_activity: number;
};

export type ILocationStatus = {
  po_number: string;
  item_number: string;
  last_status: 'in' | 'out';
  last_updated: Date;
  epc?: string;
  user_id?: number;
};

export type ILocationScanData = {
  epc: string;
  deviceId: string;
  user_id?: number;
  value?: number; // alternate user_id from reader payload
  rssi?: string;
  count?: number;
  timestamp?: number;
};