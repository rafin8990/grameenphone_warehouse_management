export type ILocation = {
  id?: number;
  location_name: string;
  location_code: string;
  sub_inventory_code?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type ILocationFilters = {
  searchTerm?: string;
  location_name?: string;
  location_code?: string;
  sub_inventory_code?: string;
};

export type ICreateLocation = Omit<ILocation, 'id' | 'created_at' | 'updated_at'>;

export type IUpdateLocation = Partial<ICreateLocation>;
