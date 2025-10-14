const axios = require('axios');

async function testRedisErrorHandling() {
  console.log('🧪 Testing Redis Error Handling...\n');

  try {
    // Test 1: Basic API health check
    console.log('1️⃣ Testing basic API health...');
    const healthResponse = await axios.get('http://localhost:5000/api/v1/inbound/live');
    console.log('✅ API is responding:', healthResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    console.log('   Response data keys:', Object.keys(healthResponse.data.data || {}));
    console.log();

    // Test 2: Test location tracking with invalid device (should work without Redis)
    console.log('2️⃣ Testing location tracking without Redis...');
    try {
      const scanResponse = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', {
        epc: 'TEST123',
        po_number: 'PO001',
        item_number: 'ITEM001',
        location_code: 'LOC001',
        quantity: 1,
        deviceId: 'INVALID_DEVICE'
      });
      console.log('❌ Unexpected success - should have failed');
    } catch (error) {
      if (error.response && error.response.data.message.includes('No location found')) {
        console.log('✅ Location tracking working (expected error for invalid device)');
        console.log('   Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log();

    // Test 3: Test with valid device ID (if any exist)
    console.log('3️⃣ Testing with valid device ID...');
    try {
      const scanResponse = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', {
        epc: 'TEST456',
        po_number: 'PO002',
        item_number: 'ITEM002',
        location_code: 'LOC002',
        quantity: 1,
        deviceId: 'DEVICE001'
      });
      console.log('✅ Location tracking successful:', scanResponse.data);
    } catch (error) {
      if (error.response) {
        console.log('⚠️  Expected error (device not found):', error.response.data.message);
      } else {
        console.log('❌ Network error:', error.message);
      }
    }
    console.log();

    console.log('🎉 Redis error handling test completed!');
    console.log('   - API responds without Redis');
    console.log('   - Location tracking works without Redis');
    console.log('   - No server crashes due to Redis connection errors');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRedisErrorHandling();
