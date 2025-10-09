const http = require('http');

const testLocationsSimple = async () => {
  console.log('🧪 Testing Locations API (Simple)...\n');

  // Test creating a location
  const testLocation = {
    location_name: 'Frontend Test Location',
    location_code: 'FRONTEND-TEST-001',
    sub_inventory_code: 'FRONTEND-SUB-001'
  };

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/locations',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log('Creating location:', testLocation);

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response Headers:', res.headers);
      
      try {
        const result = JSON.parse(data);
        console.log('Response:', JSON.stringify(result, null, 2));
        
        if (result.success) {
          console.log('✅ Location created successfully!');
          console.log('Created location ID:', result.data.id);
        } else {
          console.log('❌ Location creation failed');
          console.log('Error message:', result.message);
        }
      } catch (e) {
        console.log('❌ Failed to parse response');
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.write(JSON.stringify(testLocation));
  req.end();
};

testLocationsSimple();
