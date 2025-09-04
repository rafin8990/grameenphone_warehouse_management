import pool from '../utils/dbClient';

export const name = '1756376105073_create_vendors_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   CREATE TABLE vendors (
    id BIGSERIAL PRIMARY KEY,
    vendor_code VARCHAR(60) NOT NULL,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','obsolete')),
    org_code VARCHAR(20),
    fusion_vendor_id VARCHAR(64),
    tax_id VARCHAR(50),
    email VARCHAR(120),
    phone VARCHAR(50),
    website VARCHAR(200),
    payment_terms VARCHAR(60),
    currency VARCHAR(10),
    credit_limit NUMERIC(18,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vendor UNIQUE (vendor_code, org_code)
);
  `);
  await pool.query(`
  CREATE TABLE vendor_addresses (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('billing','shipping','head','other')),
    line1 VARCHAR(200) NOT NULL,
    line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);
};
