const http = require('http');

// Test the location tracking functionality
const testLocationTracking = async () => {
  console.log('🧪 Testing Location Tracking System...\n');

  // Test 1: Create a location first
  console.log('1. Creating a test location...');
  const locationData = JSON.stringify({
    location_name: 'Test Warehouse Gate',
    location_code: 'GATE-001',
    sub_inventory_code: 'GATE-SUB-001'
  });

  const createLocationOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/locations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(locationData)
    }
  };

  try {
    const locationResult = await makeRequest(createLocationOptions, locationData);
    console.log('✅ Location created:', locationResult.message);
  } catch (error) {
    console.log('⚠️ Location creation failed (might already exist):', error.message);
  }

  // Test 2: Create location tracker records
  console.log('\n2. Testing location tracker creation...');
  
  const trackerData1 = JSON.stringify({
    location_code: 'GATE-001',
    po_number: 'PO-2024-001',
    item_number: 'ITEM-001',
    quantity: 10,
    status: 'in'
  });

  const createTrackerOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/location-trackers',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(trackerData1)
    }
  };

  try {
    const trackerResult1 = await makeRequest(createTrackerOptions, trackerData1);
    console.log('✅ First tracker created:', trackerResult1.message);
    console.log('   Status:', trackerResult1.data.status);
  } catch (error) {
    console.log('❌ First tracker creation failed:', error.message);
  }

  // Test 3: Create another tracker with same data (should toggle status)
  console.log('\n3. Testing status toggle (same data within 30 seconds)...');
  
  const trackerData2 = JSON.stringify({
    location_code: 'GATE-001',
    po_number: 'PO-2024-001',
    item_number: 'ITEM-001',
    quantity: 10,
    status: 'in' // This should be toggled to 'out'
  });

  try {
    const trackerResult2 = await makeRequest(createTrackerOptions, trackerData2);
    console.log('✅ Second tracker created:', trackerResult2.message);
    console.log('   Status (should be toggled):', trackerResult2.data.status);
  } catch (error) {
    console.log('❌ Second tracker creation failed:', error.message);
  }

  // Test 4: Get all trackers
  console.log('\n4. Testing get all trackers...');
  const getTrackersOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/location-trackers?page=1&limit=10',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const trackersResult = await makeRequest(getTrackersOptions);
    console.log('✅ Trackers retrieved:', trackersResult.message);
    console.log('   Total trackers:', trackersResult.meta.total);
    console.log('   Trackers found:', trackersResult.data.length);
  } catch (error) {
    console.log('❌ Get trackers failed:', error.message);
  }

  // Test 5: Get tracker stats
  console.log('\n5. Testing tracker statistics...');
  const statsOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/location-trackers/stats',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const statsResult = await makeRequest(statsOptions);
    console.log('✅ Stats retrieved:', statsResult.message);
    console.log('   Total trackers:', statsResult.data.total_trackers);
    console.log('   Currently in:', statsResult.data.current_in);
    console.log('   Currently out:', statsResult.data.current_out);
    console.log('   Recent activity:', statsResult.data.recent_activity);
  } catch (error) {
    console.log('❌ Get stats failed:', error.message);
  }

  // Test 6: Test RFID scan with device ID (simulating the integrated flow)
  console.log('\n6. Testing integrated RFID scan with location tracking...');
  
  const rfidData = JSON.stringify({
    epc: 'A1B2C3D4E5F67890',
    deviceId: 'GATE-001' // This should trigger location tracking
  });

  const rfidOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/inbound/scan',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(rfidData)
    }
  };

  try {
    const rfidResult = await makeRequest(rfidOptions, rfidData);
    console.log('✅ RFID scan with location tracking:', rfidResult.message);
  } catch (error) {
    console.log('❌ RFID scan failed:', error.message);
  }

  console.log('\n🎉 Location tracking system testing completed!');
};

// Helper function to make HTTP requests
const makeRequest = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(jsonData);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${jsonData.message || 'Unknown error'}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
};

// Run the test
testLocationTracking().catch(console.error);
