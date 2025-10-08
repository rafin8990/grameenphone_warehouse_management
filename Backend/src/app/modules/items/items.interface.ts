export type IItem = {
  id?: number;
  item_number: string;
  item_description?: string | null;
  item_type?: string | null;
  inventory_organization?: string | null;
  primary_uom?: string | null;
  uom_code: string;
  item_status: 'active' | 'inactive';
  created_at?: Date;
  updated_at?: Date;
};

export type IItemFilters = {
  searchTerm?: string;
  item_number?: string;
  item_description?: string;
  item_type?: string;
  inventory_organization?: string;
  primary_uom?: string;
  uom_code?: string;
  item_status?: 'active' | 'inactive';
};
