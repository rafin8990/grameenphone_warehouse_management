const http = require('http');

// Test the locations API endpoints
const testLocationsAPI = async () => {
  console.log('🧪 Testing Locations API...\n');

  // Test 1: Create a location
  console.log('1. Testing CREATE location...');
  const createData = JSON.stringify({
    location_name: 'Main Warehouse',
    location_code: 'MAIN-WH-001',
    sub_inventory_code: 'MAIN-SUB-001'
  });

  const createOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/locations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(createData)
    }
  };

  try {
    const createResult = await makeRequest(createOptions, createData);
    console.log('✅ CREATE successful:', createResult.message);
    const createdLocation = createResult.data;
    console.log('   Created location ID:', createdLocation.id);
  } catch (error) {
    console.log('❌ CREATE failed:', error.message);
  }

  // Test 2: Get all locations
  console.log('\n2. Testing GET all locations...');
  const getOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/locations?page=1&limit=10',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const getResult = await makeRequest(getOptions);
    console.log('✅ GET all successful:', getResult.message);
    console.log('   Total locations:', getResult.meta.total);
    console.log('   Locations found:', getResult.data.length);
  } catch (error) {
    console.log('❌ GET all failed:', error.message);
  }

  // Test 3: Get location stats
  console.log('\n3. Testing GET location stats...');
  const statsOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/locations/stats',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const statsResult = await makeRequest(statsOptions);
    console.log('✅ GET stats successful:', statsResult.message);
    console.log('   Total locations:', statsResult.data.total);
    console.log('   Recent locations:', statsResult.data.recent);
  } catch (error) {
    console.log('❌ GET stats failed:', error.message);
  }

  console.log('\n🎉 Locations API testing completed!');
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
testLocationsAPI().catch(console.error);
