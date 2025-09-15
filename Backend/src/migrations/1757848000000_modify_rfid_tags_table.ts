import pool from '../utils/dbClient';

export const name = '1757848000000_modify_rfid_tags_table';

export const run = async () => {
  // First, let's backup existing data if any
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rfid_tags_backup AS 
    SELECT * FROM rfid_tags;
  `);

  // Drop the existing table and recreate with new structure
  await pool.query(`
    DROP TABLE IF EXISTS rfid_tags CASCADE;
  `);

  // Create the new rfid_tags table with the requested structure
  await pool.query(`
    CREATE TABLE rfid_tags (
      id SERIAL PRIMARY KEY,        -- Auto increment ID
      epc VARCHAR(255) NOT NULL,    -- RFID ট্যাগের EPC নম্বর
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- কখন পড়া হয়েছে
      location VARCHAR(100),        -- (অপশনাল) কোন গেট/লোকেশন থেকে পড়া হয়েছে
      reader_id VARCHAR(50),        -- (অপশনাল) কোন রিডার থেকে পড়া হয়েছে
      status VARCHAR(16) NOT NULL DEFAULT 'Available'
                    CHECK (status IN ('Available','Reserved','Assigned','Consumed','Lost','Damaged')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Create index on epc for better performance
  await pool.query(`
    CREATE INDEX idx_rfid_tags_epc ON rfid_tags(epc);
  `);

  // Create index on timestamp for better performance
  await pool.query(`
    CREATE INDEX idx_rfid_tags_timestamp ON rfid_tags(timestamp);
  `);

  // Create index on status for filtering
  await pool.query(`
    CREATE INDEX idx_rfid_tags_status ON rfid_tags(status);
  `);
};
