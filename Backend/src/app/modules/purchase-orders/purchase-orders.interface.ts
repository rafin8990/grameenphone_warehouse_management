export type IPurchaseOrder = {
  id?: number;
  po_number: string;
  vendor_id: number;
  total_amount?: number | null;
  requisition_id?: number | null;
  status: 'pending' | 'received';
  created_at?: Date;
  updated_at?: Date;
};

export type IPoItem = {
  id?: number;
  po_id: number;
  item_id: number;
  quantity: number;
  unit: string;
};

export type IPoItemRfid = {
  id?: number;
  po_item_id: number;
  rfid_id: number;
  quantity: number;
};

// Extended interfaces for relationships
export type IPurchaseOrderWithItems = IPurchaseOrder & {
  items?: IPoItem[];
};

export type IPoItemWithRfid = IPoItem & {
  rfid_tags?: IPoItemRfid[];
};

export type IPurchaseOrderComplete = IPurchaseOrder & {
  items?: IPoItemWithRfid[];
};

// Interface for creating purchase order with items and RFID
export type ICreatePurchaseOrder = IPurchaseOrder & {
  items?: Omit<IPoItem, 'po_id' | 'id'>[];
};

export type ICreatePoItem = Omit<IPoItem, 'po_id' | 'id'> & {
  rfid_tags?: Omit<IPoItemRfid, 'po_item_id' | 'id'>[];
};

export type ICreatePurchaseOrderComplete = IPurchaseOrder & {
  items?: ICreatePoItem[];
};

// Interface for updating purchase order
export type IUpdatePurchaseOrder = Partial<IPurchaseOrder> & {
  items?: (IPoItem | Omit<IPoItem, 'po_id'>)[];
};
