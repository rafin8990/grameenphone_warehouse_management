export type ILocation = {
  id?: number;
  sub_inventory_code: string;
  locator_code: string;
  name?: string | null;
  description?: string | null;
  org_code?: string | null;
  status: 'active' | 'inactive' | 'obsolete' | string;
  capacity?: number | null;
  attributes?: Record<string, any> | null;
  created_at?: Date;
  updated_at?: Date;
};
