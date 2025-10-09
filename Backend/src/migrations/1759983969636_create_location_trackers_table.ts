import pool from '../utils/dbClient';

export const name = '1759983969636_create_location_trackers_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE location_tracker (
    id SERIAL PRIMARY KEY,                   
    location_code VARCHAR(255) NOT NULL,      
    po_number VARCHAR(255) NOT NULL,        
    item_number VARCHAR(255) NOT NULL,       
    quantity INT NOT NULL DEFAULT 0,        
    status VARCHAR(10) CHECK (status IN ('in', 'out')) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),     
    updated_at TIMESTAMP DEFAULT now(),       
    CONSTRAINT fk_location FOREIGN KEY (location_code) REFERENCES locations(location_code), 
    CONSTRAINT fk_po FOREIGN KEY (po_number) REFERENCES purchase_orders(po_number),         
    CONSTRAINT fk_item FOREIGN KEY (item_number) REFERENCES items(item_number)           
);
  `);
};