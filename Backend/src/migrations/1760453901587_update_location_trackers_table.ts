import pool from '../utils/dbClient';

export const name = '1760453901587_update_location_trackers_table';

export const run = async () => {
  // Write your SQL query here
  await pool.query(`
   -- Step 1️⃣: Clear all existing data
    TRUNCATE TABLE location_tracker RESTART IDENTITY CASCADE;

    -- Step 2️⃣: Drop foreign key constraint related to location_code (if exists)
    ALTER TABLE location_tracker
    DROP CONSTRAINT IF EXISTS fk_location;

    -- Step 3️⃣: Remove the location_code column
    ALTER TABLE location_tracker
    DROP COLUMN IF EXISTS location_code;

    -- Step 4️⃣: Add the new user_id column with a foreign key reference to users table
    ALTER TABLE location_tracker
    ADD COLUMN user_id INT;

    ALTER TABLE location_tracker
    ADD CONSTRAINT fk_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  `);
};