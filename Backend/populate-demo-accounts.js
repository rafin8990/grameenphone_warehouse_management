const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

const demoAccounts = [
  {
    name: 'System Administrator',
    username: 'admin',
    email: 'admin@warehouse.com',
    mobile_no: '+1234567890',
    password: 'admin123',
    role: 'admin'
  },
  {
    name: 'Super Administrator',
    username: 'superadmin',
    email: 'superadmin@warehouse.com',
    mobile_no: '+1234567891',
    password: 'super123',
    role: 'super_admin'
  },
  {
    name: 'Warehouse Manager',
    username: 'warehouse_manager',
    email: 'manager@warehouse.com',
    mobile_no: '+1234567892',
    password: 'warehouse123',
    role: 'warehouse_manager'
  },
  {
    name: 'Room Person',
    username: 'room_person',
    email: 'room@warehouse.com',
    mobile_no: '+1234567893',
    password: 'room123',
    role: 'room_person'
  }
];

async function populateDemoAccounts() {
  try {
    console.log('🚀 Starting to populate demo accounts...');

    // Check if users already exist
    const existingUsers = await pool.query('SELECT username FROM users WHERE username = ANY($1)', 
      [demoAccounts.map(account => account.username)]
    );

    if (existingUsers.rows.length > 0) {
      console.log('⚠️  Some demo accounts already exist. Skipping...');
      console.log('Existing accounts:', existingUsers.rows.map(row => row.username));
      return;
    }

    // Insert demo accounts
    for (const account of demoAccounts) {
      const hashedPassword = await bcrypt.hash(account.password, 12);
      
      await pool.query(
        `INSERT INTO users (name, username, email, mobile_no, password, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          account.name,
          account.username,
          account.email,
          account.mobile_no,
          hashedPassword,
          account.role
        ]
      );

      console.log(`✅ Created demo account: ${account.name} (${account.username})`);
    }

    console.log('🎉 All demo accounts created successfully!');
    console.log('\n📋 Demo Account Credentials:');
    console.log('================================');
    demoAccounts.forEach(account => {
      console.log(`${account.role.toUpperCase()}:`);
      console.log(`  Username: ${account.username}`);
      console.log(`  Password: ${account.password}`);
      console.log(`  Email: ${account.email}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error populating demo accounts:', error);
  } finally {
    await pool.end();
  }
}

populateDemoAccounts();
