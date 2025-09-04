export type IRfidTag = {
  id?: number;
  tag_uid: string;
  status: 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged';
  created_at?: Date;
  updated_at?: Date;
};
