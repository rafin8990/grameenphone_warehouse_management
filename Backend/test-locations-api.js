const http = require('http');

const testLocationsAPI = async () => {
  console.log('🧪 Testing Locations API...\n');

  // Test 1: Get all locations
  console.log('1. Testing GET /api/v1/locations');
  const getOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/locations',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  await new Promise((resolve, reject) => {
    const req = http.request(getOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          const result = JSON.parse(data);
          console.log('Success:', result.success);
          console.log('Data count:', result.data?.length || 0);
          if (result.data && result.data.length > 0) {
            console.log('First location:', result.data[0]);
          }
        } catch (e) {
          console.log('Response data:', data);
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.end();
  });

  // Test 2: Create a new location
  console.log('\n2. Testing POST /api/v1/locations');
  const testLocation = {
    location_name: 'Test Location API',
    location_code: 'TEST-LOC-API-001',
    sub_inventory_code: 'TEST-SUB-001'
  };

  const postOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/locations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  await new Promise((resolve, reject) => {
    const req = http.request(postOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          const result = JSON.parse(data);
          console.log('Success:', result.success);
          console.log('Message:', result.message);
          if (result.data) {
            console.log('Created location:', result.data);
          }
        } catch (e) {
          console.log('Response data:', data);
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(testLocation));
    req.end();
  });

  // Test 3: Try to create duplicate location
  console.log('\n3. Testing duplicate location creation');
  await new Promise((resolve, reject) => {
    const req = http.request(postOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        try {
          const result = JSON.parse(data);
          console.log('Success:', result.success);
          console.log('Message:', result.message);
        } catch (e) {
          console.log('Response data:', data);
        }
        resolve();
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(testLocation));
    req.end();
  });

  console.log('\n🎉 Locations API testing complete!');
};

testLocationsAPI().catch(console.error);
