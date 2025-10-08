import pool from '../utils/dbClient';

export const name = '1759898606630_create_items_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
CREATE TYPE item_status_enum AS ENUM ('active', 'inactive');

CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    item_number VARCHAR(255) NOT NULL,
    item_description TEXT,
    item_type VARCHAR(100),
    inventory_organization VARCHAR(255),
    primary_uom VARCHAR(100),
    uom_code VARCHAR(50) NOT NULL,
    item_status item_status_enum DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_timestamp
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

  `);
};