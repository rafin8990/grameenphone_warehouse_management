export type IRequisition = {
  id?: number;
  requisition_number: string;
  requester_name?: string | null;
  organization_code?: string | null;
  status: 'open' | 'approved' | 'rejected' | 'closed' | string;
  requirement?: string | null;
  created_at?: Date;
  updated_at?: Date;
};

export type IRequisitionItem = {
  id?: number;
  requisition_id: number;
  item_id: number;
  quantity: number;
  uom?: string | null;
  remarks?: string | null;
  created_at?: Date;
  updated_at?: Date;
};

// Extended interface for requisition with items
export type IRequisitionWithItems = IRequisition & {
  items?: IRequisitionItemWithItemDetails[];
};

// Extended interface for requisition item with item details
export type IRequisitionItemWithItemDetails = IRequisitionItem & {
  item?: {
    id: number;
    item_code: string;
    item_description?: string | null;
    item_status: 'active' | 'inactive' | 'obsolete' | string;
    org_code?: string | null;
    category_id?: number | null;
    capex_opex?: 'CAPEX' | 'OPEX' | null;
    tracking_method: 'NONE' | 'SERIAL' | 'LOT' | string;
    uom_primary: string;
    uom_secondary?: string | null;
    conversion_to_primary?: number | null;
    brand?: string | null;
    model?: string | null;
    manufacturer?: string | null;
    hsn_code?: string | null;
    barcode_upc?: string | null;
    barcode_ean?: string | null;
    gs1_gtin?: string | null;
    rfid_supported?: boolean | null;
    default_location_id?: number | null;
    min_qty?: number | null;
    max_qty?: number | null;
    unit_weight_kg?: number | null;
    unit_length_cm?: number | null;
    unit_width_cm?: number | null;
    unit_height_cm?: number | null;
    images?: string[] | null;
    specs?: Record<string, any> | null;
    attributes?: Record<string, any> | null;
    fusion_item_id?: string | null;
    fusion_category?: string | null;
    created_at?: Date;
    updated_at?: Date;
  };
};
