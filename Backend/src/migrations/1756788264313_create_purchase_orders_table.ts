import pool from '../utils/dbClient';

export const name = '1756788264313_create_purchase_orders_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE purchase_orders (
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
    CREATE TABLE po_items (
     id BIGSERIAL PRIMARY KEY,
     po_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
     item_id BIGINT NOT NULL REFERENCES items(id),
     quantity NUMERIC(18,6) NOT NULL,
     unit VARCHAR(16) NOT NULL
 );
   `);
  await pool.query(`
    CREATE TABLE po_items_rfid (
     id BIGSERIAL PRIMARY KEY,
     po_item_id BIGINT NOT NULL REFERENCES po_items(id) ON DELETE CASCADE,
     rfid_id BIGINT NOT NULL REFERENCES rfid_tags(id),
     quantity NUMERIC(18,6) DEFAULT 1
 );
   `);
};
