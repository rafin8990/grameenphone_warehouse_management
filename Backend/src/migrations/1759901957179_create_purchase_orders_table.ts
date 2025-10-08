import pool from '../utils/dbClient';

export const name = '1759901957179_create_purchase_orders_table';

export const run = async () => {
  await pool.query(`
  ALTER TABLE items
  ADD CONSTRAINT unique_item_number UNIQUE (item_number);

  CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(100) NOT NULL,
    po_description TEXT,
    supplier_name VARCHAR(255) NOT NULL,
    po_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE po_items (
    id SERIAL PRIMARY KEY,
    po_id INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_number VARCHAR(255) NOT NULL REFERENCES items(item_number) ON UPDATE CASCADE ON DELETE RESTRICT,
    quantity NUMERIC NOT NULL,
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

CREATE TRIGGER trigger_update_items
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_purchase_orders
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_po_items
BEFORE UPDATE ON po_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
  `);
};
