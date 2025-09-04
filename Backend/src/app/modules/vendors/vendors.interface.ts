export type IVendor = {
  id?: number;
  vendor_code: string;
  name: string;
  short_name?: string | null;
  status: 'active' | 'inactive' | 'obsolete' | string;
  org_code?: string | null;
  fusion_vendor_id?: string | null;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  payment_terms?: string | null;
  currency?: string | null;
  credit_limit?: number | null;
  created_at?: Date;
  updated_at?: Date;
};

export type IVendorAddress = {
  id?: number;
  vendor_id: number;
  type: 'billing' | 'shipping' | 'head' | 'other' | string;
  line1: string;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country: string;
  is_default?: boolean | null;
  attributes?: Record<string, any> | null;
  created_at?: Date;
  updated_at?: Date;
};

// Extended interface for vendor with addresses
export type IVendorWithAddresses = IVendor & {
  addresses?: IVendorAddress[];
};

// Interface for creating vendor with addresses
export type ICreateVendorWithAddresses = IVendor & {
  addresses?: Omit<IVendorAddress, 'vendor_id' | 'id' | 'created_at' | 'updated_at'>[];
};
