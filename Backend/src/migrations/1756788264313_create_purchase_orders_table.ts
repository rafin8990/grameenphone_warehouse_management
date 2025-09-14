import pool from '../utils/dbClient';

export const name = '1756788264312_create_purchase_orders_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
     id BIGSERIAL PRIMARY KEY,
     po_number VARCHAR(60) NOT NULL UNIQUE,
     vendor_id BIGINT NOT NULL REFERENCES vendors(id),
     total_amount NUMERIC(18,2),
     requisition_id BIGINT REFERENCES requisitions(id),
     status VARCHAR(20) NOT NULL CHECK (status IN ('pending','received')),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 );
   `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS po_items (
     id BIGSERIAL PRIMARY KEY,
     po_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
     item_id BIGINT NOT NULL REFERENCES items(id),
     quantity NUMERIC(18,6) NOT NULL,
     unit VARCHAR(16) NOT NULL
 );
   `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS po_items_rfid (
     id BIGSERIAL PRIMARY KEY,
     po_item_id BIGINT NOT NULL REFERENCES po_items(id) ON DELETE CASCADE,
     rfid_id BIGINT NOT NULL REFERENCES rfid_tags(id),
     quantity NUMERIC(18,6) DEFAULT 1
 );
   `);


  await pool.query(`
    ALTER TABLE purchase_orders
      ADD COLUMN currency VARCHAR(10) DEFAULT 'BDT',
      ADD COLUMN status_reason VARCHAR(120),
      ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR(20);
    
    ALTER TABLE purchase_orders
      DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
    ALTER TABLE purchase_orders
      ADD CONSTRAINT purchase_orders_status_check
      CHECK (status IN ('pending','approved','partially_received','received','closed','cancelled'));

    ALTER TABLE po_items
      ADD COLUMN unit_price NUMERIC(18,2),
      ADD COLUMN tax_percent NUMERIC(5,2),
      ADD COLUMN line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity * COALESCE(unit_price,0)) STORED;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_poitem_rfid ON po_items_rfid (po_item_id, rfid_id);
   `);
};
