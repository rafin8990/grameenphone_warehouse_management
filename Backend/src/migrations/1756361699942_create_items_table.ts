import pool from '../utils/dbClient';

export const name = '1756361699942_create_items_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   CREATE TABLE items (
    id BIGSERIAL PRIMARY KEY,
    item_code VARCHAR(60) NOT NULL,
    item_description TEXT,
    item_status VARCHAR(20) DEFAULT 'active' CHECK (item_status IN ('active','inactive','obsolete')),
    org_code VARCHAR(20),
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    capex_opex VARCHAR(10) CHECK (capex_opex IN ('CAPEX','OPEX')),
    tracking_method VARCHAR(10) NOT NULL CHECK (tracking_method IN ('NONE','SERIAL','LOT')),
    uom_primary VARCHAR(16) NOT NULL,
    uom_secondary VARCHAR(16),
    conversion_to_primary NUMERIC(18,6),
    brand VARCHAR(80),
    model VARCHAR(80),
    manufacturer VARCHAR(120),
    hsn_code VARCHAR(32),
    barcode_upc VARCHAR(32),
    barcode_ean VARCHAR(32),
    gs1_gtin VARCHAR(32),
    rfid_supported BOOLEAN DEFAULT TRUE,
    default_location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
    min_qty NUMERIC(18,6) DEFAULT 0,
    max_qty NUMERIC(18,6),
    unit_weight_kg NUMERIC(18,6),
    unit_length_cm NUMERIC(18,3),
    unit_width_cm NUMERIC(18,3),
    unit_height_cm NUMERIC(18,3),
    images TEXT[],
    specs JSONB DEFAULT '{}'::jsonb,
    attributes JSONB DEFAULT '{}'::jsonb,
    fusion_item_id VARCHAR(64),
    fusion_category VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_item_org UNIQUE (item_code, org_code)
);
  `);
};