import pool from '../utils/dbClient';

export const name = '1759982142620_create_locations_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    -- Drop existing trigger and function if they exist
    DROP TRIGGER IF EXISTS update_location_updated_at ON locations;
    DROP FUNCTION IF EXISTS update_updated_at();
    
    -- Drop and recreate table
    DROP TABLE IF EXISTS locations CASCADE;
    
    CREATE TABLE locations (
      id SERIAL PRIMARY KEY,      
      location_name TEXT NOT NULL,         
      location_code TEXT NOT NULL UNIQUE,
      sub_inventory_code TEXT,           
      created_at TIMESTAMP DEFAULT now(), 
      updated_at TIMESTAMP DEFAULT now() 
    );

    -- Create function and trigger
    CREATE OR REPLACE FUNCTION update_updated_at() 
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW(); 
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_location_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

  `);
};