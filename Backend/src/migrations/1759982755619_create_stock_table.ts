import pool from '../utils/dbClient';

export const name = '1759982755619_create_stock_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   ALTER TABLE purchase_orders
   ADD CONSTRAINT unique_po_number UNIQUE (po_number);
    DROP TABLE IF EXISTS stocks;
    CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,                      
    po_number VARCHAR(255) NOT NULL,            
    item_number VARCHAR(255) NOT NULL,          
    quantity INT NOT NULL DEFAULT 0,           
    created_at TIMESTAMP DEFAULT now(),        
    updated_at TIMESTAMP DEFAULT now(),         
    CONSTRAINT fk_po FOREIGN KEY (po_number) REFERENCES purchase_orders(po_number),
    CONSTRAINT fk_item FOREIGN KEY (item_number) REFERENCES items(item_number)
);
  `);
};