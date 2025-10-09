const http = require('http');

// Test the RFID scan endpoint to verify ordered quantity is included
const testData = {
  epc: 'A1B2C3D4E5F67890' // This should be a valid EPC from po_hex_codes table
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/inbound/scan',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing RFID scan with ordered quantity...');
console.log('URL: http://localhost:5000/api/v1/inbound/scan');
console.log('Test Data:', testData);

const req = http.request(options, (res) => {
  console.log(`\nStatus: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      // Check if ordered_quantity is present in the response
      if (jsonData.data && jsonData.data.ordered_quantity !== undefined) {
        console.log('\n✅ SUCCESS: ordered_quantity is included in the response');
        console.log(`Ordered Quantity: ${jsonData.data.ordered_quantity}`);
        console.log(`Received Quantity: ${jsonData.data.quantity}`);
        console.log(`Progress: ${Math.round((jsonData.data.quantity / jsonData.data.ordered_quantity) * 100)}%`);
      } else {
        console.log('\n❌ FAILED: ordered_quantity is missing from the response');
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`\nProblem with request: ${e.message}`);
  console.log('\nMake sure the backend server is running on port 5000');
  console.log('Run: cd Backend && npm run dev');
});

req.setTimeout(10000, () => {
  console.log('\nRequest timeout - server might not be running');
  req.destroy();
});

req.write(postData);
req.end();
