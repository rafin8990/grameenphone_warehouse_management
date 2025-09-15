export type IRfidTag = {
  id?: number;
  epc: string;
  timestamp?: Date;
  location?: string | null;
  reader_id?: string | null;
  status: 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged';
  rssi?: string | null;
  count?: number | null;
  device_id?: string | null;
  session_id?: string | null;
  parent_tag?: number | null;
  created_at?: Date;
  updated_at?: Date;
};

// UHF-specific interfaces to match Java code
export type IUHFTagRequest = {
  epc: string;
  rssi: string;
  count: number;
  timestamp: number;
  deviceId: string;
};

export type IUHFTagsBatchRequest = {
  tags: IUHFTagRequest[];
  sessionId: string;
};

export type IUHFResponse = {
  success: boolean;
  message: string;
  data?: string;
  code: number;
};

export type IUHFTag = {
  id?: number;
  epc: string;
  rssi?: string;
  count?: number;
  timestamp?: Date;
  deviceId?: string;
  sessionId?: string;
  location?: string | null;
  reader_id?: string | null;
  status: 'Available' | 'Reserved' | 'Assigned' | 'Consumed' | 'Lost' | 'Damaged';
  parent_tag?: number | null;
  created_at?: Date;
  updated_at?: Date;
};
