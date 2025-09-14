import pool from '../utils/dbClient';

export const name = '1756386694542_create_requisitions_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    CREATE TABLE IF NOT EXISTS requisitions (
    id BIGSERIAL PRIMARY KEY,
    requisition_number VARCHAR(50) NOT NULL UNIQUE,
    requester_name VARCHAR(100),
    organization_code VARCHAR(20),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open','approved','rejected','closed')),
    requirement TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);
  await pool.query(`
   CREATE TABLE IF NOT EXISTS requisition_items (
    id BIGSERIAL PRIMARY KEY,
    requisition_id BIGINT NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    quantity NUMERIC(18,6) NOT NULL,
    uom VARCHAR(16),
    remarks VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);
};
