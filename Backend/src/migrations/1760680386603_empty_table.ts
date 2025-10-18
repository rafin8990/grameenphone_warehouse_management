import pool from '../utils/dbClient';

export const name = '1760680386679_empty_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
     TRUNCATE TABLE location_tracker RESTART IDENTITY CASCADE;
    TRUNCATE TABLE inbound RESTART IDENTITY CASCADE;
    TRUNCATE TABLE stocks RESTART IDENTITY CASCADE;
  `);
};