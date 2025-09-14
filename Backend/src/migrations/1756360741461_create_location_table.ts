import pool from '../utils/dbClient';

export const name = '1756360741460_create_location_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    sub_inventory_code VARCHAR(50) NOT NULL,
    locator_code VARCHAR(50) NOT NULL,
    name VARCHAR(120),
    description TEXT,
    org_code VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','obsolete')),
    capacity NUMERIC(18,2),
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_location UNIQUE (sub_inventory_code, locator_code, org_code)
);
  `);
};
