import pool from '../utils/dbClient';

export const name = '1759927534470_create_inbounds_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
      CREATE TABLE inbound (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(100) NOT NULL,
        items JSONB NOT NULL,  -- Stores array of item objects (item_number, item_description, quantity)
        received_at DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Trigger function for auto-updating updated_at
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Apply trigger
    CREATE TRIGGER trigger_update_inbound
    BEFORE UPDATE ON inbound
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  `);
};
