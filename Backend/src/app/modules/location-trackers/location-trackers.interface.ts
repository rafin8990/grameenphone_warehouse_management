export type ILocationTracker = {
  id?: number;
  location_code: string;
  po_number: string;
  item_number: string;
  quantity: number;
  status: 'in' | 'out';
  created_at?: Date;
  updated_at?: Date;
};

export type ILocationTrackerFilters = {
  searchTerm?: string;
  location_code?: string;
  po_number?: string;
  item_number?: string;
  status?: 'in' | 'out';
  start_date?: string;
  end_date?: string;
};

export type ICreateLocationTracker = Omit<ILocationTracker, 'id' | 'created_at' | 'updated_at'>;

export type ILocationTrackerStats = {
  total_trackers: number;
  current_in: number;
  current_out: number;
  recent_activity: number;
};

export type ILocationStatus = {
  location_code: string;
  po_number: string;
  item_number: string;
  last_status: 'in' | 'out';
  last_updated: Date;
};
