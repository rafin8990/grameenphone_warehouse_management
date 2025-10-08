import pool from '../utils/dbClient';

export const name = '1759921463954_create_generate_hex_codes_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE po_hex_codes (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(100) NOT NULL,
        lot_no VARCHAR(100) NOT NULL,
        item_number VARCHAR(255) NOT NULL,
        quantity NUMERIC NOT NULL,
        uom VARCHAR(50) NOT NULL,
        hex_code CHAR(16) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Trigger function to auto-update updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Apply trigger
    CREATE TRIGGER trigger_update_po_hex_codes
    BEFORE UPDATE ON po_hex_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  `);
};
