export type IRfidTag = {
  id?: number;
  tag_uid: string;
  status: 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged';
  parent_tag_id?: number | null;
  current_location_id?: number | null;
  created_at?: Date;
  updated_at?: Date;
};
