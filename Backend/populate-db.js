const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'warehouse_management',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function populateDatabase() {
  try {
    console.log('Populating database with basic data...\n');

    // Insert basic categories
    console.log('Inserting categories...');
    await pool.query(`
      INSERT INTO categories (code, name, description, status) VALUES 
      ('CAT001', 'Electronics', 'Electronic devices and components', 'active'),
      ('CAT002', 'Furniture', 'Office and warehouse furniture', 'active'),
      ('CAT003', 'Office Supplies', 'General office supplies', 'active'),
      ('CAT004', 'Tools', 'Maintenance and repair tools', 'active'),
      ('CAT005', 'Safety Equipment', 'Safety and protective equipment', 'active')
      ON CONFLICT (code) DO NOTHING
    `);

    // Insert basic locations
    console.log('Inserting locations...');
    await pool.query(`
      INSERT INTO locations (sub_inventory_code, locator_code, name, description, status, capacity) VALUES 
      ('WH001', 'A-01-01', 'Main Warehouse A1', 'Primary storage area', 'active', 1000),
      ('WH001', 'A-01-02', 'Main Warehouse A2', 'Secondary storage area', 'active', 800),
      ('WH001', 'B-01-01', 'Main Warehouse B1', 'Cold storage area', 'active', 500),
      ('WH002', 'C-01-01', 'Secondary Warehouse C1', 'Overflow storage', 'active', 1200),
      ('WH002', 'C-01-02', 'Secondary Warehouse C2', 'Special items storage', 'active', 600)
      ON CONFLICT (sub_inventory_code, locator_code, org_code) DO NOTHING
    `);

    // Insert basic vendors
    console.log('Inserting vendors...');
    await pool.query(`
      INSERT INTO vendors (vendor_code, name, short_name, status, email, phone) VALUES 
      ('VEN001', 'Tech Solutions Ltd', 'TechSol', 'active', 'contact@techsol.com', '+1234567890'),
      ('VEN002', 'Office World Inc', 'OfficeWorld', 'active', 'sales@officeworld.com', '+1234567891'),
      ('VEN003', 'Industrial Supplies Co', 'IndSupplies', 'active', 'orders@indsupplies.com', '+1234567892'),
      ('VEN004', 'Safety First Corp', 'SafetyFirst', 'active', 'info@safetyfirst.com', '+1234567893'),
      ('VEN005', 'Tool Masters LLC', 'ToolMasters', 'active', 'support@toolmasters.com', '+1234567894')
      ON CONFLICT (vendor_code, org_code) DO NOTHING
    `);

    // Get category and location IDs for items
    const categories = await pool.query('SELECT id FROM categories ORDER BY id LIMIT 5');
    const locations = await pool.query('SELECT id FROM locations ORDER BY id LIMIT 5');

    // Insert basic items
    console.log('Inserting items...');
    if (categories.rows.length > 0 && locations.rows.length > 0) {
      await pool.query(`
        INSERT INTO items (item_code, item_description, item_status, category_id, default_location_id, uom_primary, brand, model) VALUES 
        ('ITEM001', 'Desktop Computer', 'active', ${categories.rows[0].id}, ${locations.rows[0].id}, 'EA', 'Dell', 'OptiPlex 7090'),
        ('ITEM002', 'Office Chair', 'active', ${categories.rows[1].id}, ${locations.rows[1].id}, 'EA', 'Herman Miller', 'Aeron'),
        ('ITEM003', 'Printer Paper', 'active', ${categories.rows[2].id}, ${locations.rows[2].id}, 'REAM', 'HP', 'Premium'),
        ('ITEM004', 'Drill Machine', 'active', ${categories.rows[3].id}, ${locations.rows[3].id}, 'EA', 'Bosch', 'GSB 13 RE'),
        ('ITEM005', 'Safety Helmet', 'active', ${categories.rows[4].id}, ${locations.rows[4].id}, 'EA', '3M', 'H-700')
        ON CONFLICT (item_code, org_code) DO NOTHING
      `);
    }

    // Insert basic RFID tags
    console.log('Inserting RFID tags...');
    await pool.query(`
      INSERT INTO rfid_tags (tag_uid, status) VALUES 
      ('RFID001', 'available'),
      ('RFID002', 'available'),
      ('RFID003', 'available'),
      ('RFID004', 'available'),
      ('RFID005', 'available'),
      ('RFID006', 'assigned'),
      ('RFID007', 'available'),
      ('RFID008', 'available'),
      ('RFID009', 'available'),
      ('RFID010', 'available')
      ON CONFLICT (tag_uid) DO NOTHING
    `);

    // Insert basic requisitions
    console.log('Inserting requisitions...');
    await pool.query(`
      INSERT INTO requisitions (requisition_number, requester_name, organization_code, status, requirement) VALUES 
      ('REQ001', 'John Doe', 'ORG001', 'open', 'Need new office supplies'),
      ('REQ002', 'Jane Smith', 'ORG001', 'open', 'Safety equipment for construction site'),
      ('REQ003', 'Mike Johnson', 'ORG002', 'approved', 'IT equipment upgrade'),
      ('REQ004', 'Sarah Wilson', 'ORG001', 'open', 'Maintenance tools for workshop'),
      ('REQ005', 'David Brown', 'ORG002', 'closed', 'Furniture for new office')
      ON CONFLICT (requisition_number) DO NOTHING
    `);

    // Insert basic purchase orders
    console.log('Inserting purchase orders...');
    await pool.query(`
      INSERT INTO purchase_orders (po_number, vendor_id, status, total_amount, created_at) VALUES 
      ('PO001', 1, 'pending', 1500.00, NOW()),
      ('PO002', 2, 'approved', 2500.00, NOW()),
      ('PO003', 3, 'pending', 800.00, NOW()),
      ('PO004', 4, 'completed', 1200.00, NOW()),
      ('PO005', 5, 'pending', 3000.00, NOW())
      ON CONFLICT (po_number) DO NOTHING
    `);

    console.log('\n✅ Database populated successfully!');
    
    // Show summary
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM locations) as locations,
        (SELECT COUNT(*) FROM vendors) as vendors,
        (SELECT COUNT(*) FROM items) as items,
        (SELECT COUNT(*) FROM rfid_tags WHERE status = 'available') as available_rfid,
        (SELECT COUNT(*) FROM requisitions WHERE status = 'open') as open_requisitions,
        (SELECT COUNT(*) FROM purchase_orders) as purchase_orders,
        (SELECT COUNT(*) FROM purchase_orders WHERE status = 'pending') as pending_purchase_orders
    `);
    
    console.log('\n--- Database Summary ---');
    console.log(`Categories: ${stats.rows[0].categories}`);
    console.log(`Locations: ${stats.rows[0].locations}`);
    console.log(`Vendors: ${stats.rows[0].vendors}`);
    console.log(`Items: ${stats.rows[0].items}`);
    console.log(`Available RFID: ${stats.rows[0].available_rfid}`);
    console.log(`Open Requisitions: ${stats.rows[0].open_requisitions}`);
    console.log(`Purchase Orders: ${stats.rows[0].purchase_orders}`);
    console.log(`Pending Purchase Orders: ${stats.rows[0].pending_purchase_orders}`);

  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    await pool.end();
  }
}

populateDatabase();
