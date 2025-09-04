import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { IGenericResponse } from '../../../interfaces/common';
import { IPaginationOptions } from '../../../interfaces/pagination';
import pool from '../../../utils/dbClient';
import { ICreateVendorWithAddresses, IVendor, IVendorWithAddresses } from './vendors.interface';

const createVendor = async (data: ICreateVendorWithAddresses): Promise<IVendorWithAddresses | null> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { addresses, ...vendorData } = data;

    const insertQuery = `
      INSERT INTO vendors 
        (vendor_code, name, short_name, status, org_code, fusion_vendor_id, 
         tax_id, email, phone, website, payment_terms, currency, credit_limit)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      vendorData.vendor_code,
      vendorData.name,
      vendorData.short_name ?? null,
      vendorData.status ?? 'active',
      vendorData.org_code ?? null,
      vendorData.fusion_vendor_id ?? null,
      vendorData.tax_id ?? null,
      vendorData.email ?? null,
      vendorData.phone ?? null,
      vendorData.website ?? null,
      vendorData.payment_terms ?? null,
      vendorData.currency ?? null,
      vendorData.credit_limit ?? null,
    ];

    const result = await client.query(insertQuery, values);
    const vendor = result.rows[0];

    // Insert addresses if provided
    if (addresses && addresses.length > 0) {
      for (const address of addresses) {
        const insertAddressQuery = `
          INSERT INTO vendor_addresses 
            (vendor_id, type, line1, line2, city, state, postal_code, country, is_default, attributes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `;

        const addressValues = [
          vendor.id,
          address.type,
          address.line1,
          address.line2 ?? null,
          address.city ?? null,
          address.state ?? null,
          address.postal_code ?? null,
          address.country,
          address.is_default ?? false,
          address.attributes ?? {},
        ];

        await client.query(insertAddressQuery, addressValues);
      }
    }

    await client.query('COMMIT');

    // Return vendor with addresses using the same client
    const query = `
      SELECT 
        v.*,
        json_agg(
          json_build_object(
            'id', va.id,
            'vendor_id', va.vendor_id,
            'type', va.type,
            'line1', va.line1,
            'line2', va.line2,
            'city', va.city,
            'state', va.state,
            'postal_code', va.postal_code,
            'country', va.country,
            'is_default', va.is_default,
            'attributes', va.attributes,
            'created_at', va.created_at,
            'updated_at', va.updated_at
          )
        ) FILTER (WHERE va.id IS NOT NULL) as addresses
      FROM vendors v
      LEFT JOIN vendor_addresses va ON v.id = va.vendor_id
      WHERE v.id = $1
      GROUP BY v.id;
    `;

    const finalResult = await client.query(query, [vendor.id]);
    const vendorWithAddresses = finalResult.rows[0];

    return {
      ...vendorWithAddresses,
      addresses: vendorWithAddresses.addresses || [],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create vendor');
  } finally {
    client.release();
  }
};

const getAllVendors = async (
  filters: Partial<IVendor> & { 
    searchTerm?: string;
    credit_limit_min?: number;
    credit_limit_max?: number;
  },
  paginationOptions: IPaginationOptions
): Promise<IGenericResponse<IVendorWithAddresses[]>> => {
  const { 
    searchTerm, 
    credit_limit_min, 
    credit_limit_max,
    ...filterFields 
  } = filters;
  
  const {
    page,
    limit,
    skip,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = paginationHelpers.calculatePagination(paginationOptions);

  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (searchTerm) {
    conditions.push(`(v.vendor_code ILIKE $${paramIndex} OR v.name ILIKE $${paramIndex} OR v.short_name ILIKE $${paramIndex} OR v.tax_id ILIKE $${paramIndex} OR v.email ILIKE $${paramIndex} OR v.phone ILIKE $${paramIndex})`);
    values.push(`%${searchTerm}%`);
    paramIndex++;
  }

  // Handle credit limit range filtering
  if (credit_limit_min !== undefined) {
    conditions.push(`v.credit_limit >= $${paramIndex}`);
    values.push(credit_limit_min);
    paramIndex++;
  }

  if (credit_limit_max !== undefined) {
    conditions.push(`v.credit_limit <= $${paramIndex}`);
    values.push(credit_limit_max);
    paramIndex++;
  }

  for (const [field, value] of Object.entries(filterFields)) {
    if (value !== undefined && value !== null) {
      conditions.push(`v.${field} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT v.*
    FROM vendors v
    ${whereClause}
    ORDER BY v.${sortBy} ${sortOrder}
    LIMIT $${paramIndex++} OFFSET $${paramIndex};
  `;

  values.push(limit, skip);

  const result = await pool.query(query, values);

  // Get vendor addresses for all vendors in a single query
  const vendorIds = result.rows.map(v => v.id);
  let vendorsWithAddresses: IVendorWithAddresses[] = result.rows.map(v => ({ ...v, addresses: [] }));

  if (vendorIds.length > 0) {
    const addressesQuery = `
      SELECT 
        va.id,
        va.vendor_id,
        va.type,
        va.line1,
        va.line2,
        va.city,
        va.state,
        va.postal_code,
        va.country,
        va.is_default,
        va.attributes,
        va.created_at,
        va.updated_at
      FROM vendor_addresses va
      WHERE va.vendor_id = ANY($1)
      ORDER BY va.vendor_id, va.is_default DESC, va.created_at ASC
    `;
    
    const addressesResult = await pool.query(addressesQuery, [vendorIds]);
    
    // Group addresses by vendor_id
    const addressesByVendorId = addressesResult.rows.reduce((acc, row) => {
      if (!acc[row.vendor_id]) {
        acc[row.vendor_id] = [];
      }
      acc[row.vendor_id].push({
        id: row.id,
        vendor_id: row.vendor_id,
        type: row.type,
        line1: row.line1,
        line2: row.line2,
        city: row.city,
        state: row.state,
        postal_code: row.postal_code,
        country: row.country,
        is_default: row.is_default,
        attributes: row.attributes,
        created_at: row.created_at,
        updated_at: row.updated_at
      });
      return acc;
    }, {} as Record<number, any[]>);
    
    // Assign addresses to their respective vendors
    vendorsWithAddresses = vendorsWithAddresses.map(vendor => ({
      ...vendor,
      addresses: addressesByVendorId[vendor.id!] || []
    }));
  }

  const countQuery = `SELECT COUNT(*) FROM vendors v ${whereClause};`;
  const countResult = await pool.query(countQuery, values.slice(0, paramIndex - 2));
  const total = parseInt(countResult.rows[0].count, 10);

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
    data: vendorsWithAddresses,
  };
};

const getSingleVendor = async (id: number): Promise<IVendorWithAddresses | null> => {
  const query = `
    SELECT 
      v.*,
      json_agg(
        json_build_object(
          'id', va.id,
          'vendor_id', va.vendor_id,
          'type', va.type,
          'line1', va.line1,
          'line2', va.line2,
          'city', va.city,
          'state', va.state,
          'postal_code', va.postal_code,
          'country', va.country,
          'is_default', va.is_default,
          'attributes', va.attributes,
          'created_at', va.created_at,
          'updated_at', va.updated_at
        )
      ) FILTER (WHERE va.id IS NOT NULL) as addresses
    FROM vendors v
    LEFT JOIN vendor_addresses va ON v.id = va.vendor_id
    WHERE v.id = $1
    GROUP BY v.id;
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
  }

  const vendor = result.rows[0];
  return {
    ...vendor,
    addresses: vendor.addresses || [],
  };
};

const updateVendor = async (
  id: number,
  data: Partial<IVendor>
): Promise<IVendor | null> => {
  try {
    const fields = Object.keys(data);
    if (fields.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No data provided for update');
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');
    
    const values = fields.map(field => (data as any)[field]);
    values.push(id);

    const query = `
      UPDATE vendors
      SET ${setClause}, updated_at = NOW()
      WHERE id = $${fields.length + 1}
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
    }

    return result.rows[0];
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update vendor');
  }
};

const deleteVendor = async (id: number): Promise<void> => {
  try {
    const result = await pool.query(
      'DELETE FROM vendors WHERE id = $1 RETURNING *;',
      [id]
    );

    if (result.rowCount === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Vendor not found');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to delete vendor');
  }
};

export const VendorService = {
  createVendor,
  getAllVendors,
  getSingleVendor,
  updateVendor,
  deleteVendor,
};
