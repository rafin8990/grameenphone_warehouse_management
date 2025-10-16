import pool from '../utils/dbClient';

export const name = '1760509980889_empty_inbound_location_tracker';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
    TRUNCATE TABLE location_tracker RESTART IDENTITY CASCADE;
    TRUNCATE TABLE inbound RESTART IDENTITY CASCADE;
  `);
};