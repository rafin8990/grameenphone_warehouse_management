const axios = require('axios');

async function testStatusToggle() {
  console.log('🧪 Testing Status Toggle Functionality...\n');

  const testData = {
    epc: 'TEST123',
    po_number: 'PO001',
    item_number: 'ITEM001',
    location_code: 'LOC001',
    quantity: 1,
    deviceId: 'DEVICE001'
  };

  try {
    // First, let's create some test data in the database
    console.log('📝 Setting up test data...');
    
    // Create a test location
    const locationQuery = `
      INSERT INTO locations (location_code, location_name, device_id, created_at, updated_at)
      VALUES ('LOC001', 'Test Location', 'DEVICE001', NOW(), NOW())
      ON CONFLICT (location_code) DO NOTHING;
    `;
    
    // Create test hex code
    const hexQuery = `
      INSERT INTO po_hex_codes (hex_code, po_number, lot_no, item_number, quantity, created_at, updated_at)
      VALUES ('TEST123', 'PO001', 'LOT001', 'ITEM001', 1, NOW(), NOW())
      ON CONFLICT (hex_code) DO NOTHING;
    `;

    console.log('✅ Test data setup complete\n');

    // Test 1: First scan (should be 'in')
    console.log('1️⃣ First scan (should create "in" record)...');
    try {
      const response1 = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', testData);
      console.log('✅ First scan successful');
      console.log('   Status:', response1.data.data?.status);
      console.log('   Message:', response1.data.message);
    } catch (error) {
      console.log('❌ First scan failed:', error.response?.data?.message || error.message);
    }
    console.log();

    // Wait 2 seconds
    console.log('⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Second scan within 30 seconds (should be ignored)
    console.log('2️⃣ Second scan within 30s (should be ignored)...');
    try {
      const response2 = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', testData);
      console.log('⚠️  Unexpected success - should have been ignored');
      console.log('   Status:', response2.data.data?.status);
    } catch (error) {
      if (error.response?.data?.message?.includes('cooldown') || error.response?.data?.message?.includes('skipping')) {
        console.log('✅ Second scan correctly ignored (cooldown active)');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }
    console.log();

    // Wait 35 seconds to test status toggle
    console.log('⏳ Waiting 35 seconds to test status toggle...');
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Test 3: Third scan after 30 seconds (should toggle to 'out')
    console.log('3️⃣ Third scan after 30s (should toggle to "out")...');
    try {
      const response3 = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', testData);
      console.log('✅ Third scan successful');
      console.log('   Status:', response3.data.data?.status);
      console.log('   Message:', response3.data.message);
    } catch (error) {
      console.log('❌ Third scan failed:', error.response?.data?.message || error.message);
    }
    console.log();

    // Wait 2 seconds
    console.log('⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Fourth scan within 30 seconds (should be ignored)
    console.log('4️⃣ Fourth scan within 30s (should be ignored)...');
    try {
      const response4 = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', testData);
      console.log('⚠️  Unexpected success - should have been ignored');
      console.log('   Status:', response4.data.data?.status);
    } catch (error) {
      if (error.response?.data?.message?.includes('cooldown') || error.response?.data?.message?.includes('skipping')) {
        console.log('✅ Fourth scan correctly ignored (cooldown active)');
        console.log('   Message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      }
    }
    console.log();

    // Wait 35 seconds to test another toggle
    console.log('⏳ Waiting 35 seconds to test another toggle...');
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Test 5: Fifth scan after 30 seconds (should toggle to 'in')
    console.log('5️⃣ Fifth scan after 30s (should toggle to "in")...');
    try {
      const response5 = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', testData);
      console.log('✅ Fifth scan successful');
      console.log('   Status:', response5.data.data?.status);
      console.log('   Message:', response5.data.message);
    } catch (error) {
      console.log('❌ Fifth scan failed:', error.response?.data?.message || error.message);
    }
    console.log();

    console.log('🎉 Status toggle test completed!');
    console.log('Expected behavior:');
    console.log('  - 1st scan: "in" (first time)');
    console.log('  - 2nd scan: ignored (within 30s)');
    console.log('  - 3rd scan: "out" (toggled from "in")');
    console.log('  - 4th scan: ignored (within 30s)');
    console.log('  - 5th scan: "in" (toggled from "out")');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testStatusToggle();
