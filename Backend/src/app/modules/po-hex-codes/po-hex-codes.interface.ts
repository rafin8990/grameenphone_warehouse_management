export type IPoHexCode = {
  id?: number;
  po_number: string;
  lot_no: string;
  item_number: string;
  quantity: number;
  uom: string;
  hex_code?: string; // Auto-generated, 16 characters
  created_at?: Date;
  updated_at?: Date;
};

export type IPoHexCodeFilters = {
  searchTerm?: string;
  po_number?: string;
  lot_no?: string;
  item_number?: string;
  hex_code?: string;
};

