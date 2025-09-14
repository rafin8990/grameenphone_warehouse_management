import pool from '../utils/dbClient';

export const name = '1757847859039_create_dispatch_shipment_tables';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS shipments (
  id BIGSERIAL PRIMARY KEY,
  shipment_no VARCHAR(60) UNIQUE NOT NULL,
  dealer_name VARCHAR(120),
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft','staged','dispatched','delivered','returned')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
  `);

  await pool.query(`
  CREATE TABLE IF NOT EXISTS shipment_containers (
  id BIGSERIAL PRIMARY KEY,
  shipment_id BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  container_id BIGINT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  UNIQUE (shipment_id, container_id)
);
  `);
};
