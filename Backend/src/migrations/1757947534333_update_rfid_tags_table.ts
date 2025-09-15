import pool from '../utils/dbClient';

export const name = '1757947534333_update_rfid_tags_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    ALTER TABLE rfid_tags 
    ADD COLUMN IF NOT EXISTS parent_tag BIGINT REFERENCES locations(id) ON DELETE SET NULL
  `);
};