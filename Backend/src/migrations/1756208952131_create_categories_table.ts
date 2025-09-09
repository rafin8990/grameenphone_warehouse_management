import pool from '../utils/dbClient';

export const name = '1756208952131_create_items_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
  CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    fusion_category_code VARCHAR(120),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
  `);
};