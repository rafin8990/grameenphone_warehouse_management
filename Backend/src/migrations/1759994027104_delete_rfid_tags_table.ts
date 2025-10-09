import pool from '../utils/dbClient';

export const name = '1759994027104_delete_rfid_tags_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
DROP TABLE IF EXISTS rfid_tags;
  `);
};