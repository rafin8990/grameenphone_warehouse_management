export type ICategory = {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  parent_id?: number | null;
  status: 'active' | 'inactive' | string;
  fusion_category_code?: string | null;
  created_at?: Date;
  updated_at?: Date;
};
