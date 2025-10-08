// Test Socket Emit
// Run this to manually test socket emission

const axios = require('axios');

const testData = {
  epc: 'E4DAA89CD0370C17',  // Your hex code
  rssi: '-45',
  deviceId: 'test_device'
};

console.log('📡 Sending test scan...');
console.log('Data:', testData);

axios.post('http://localhost:5000/api/v1/inbound/scan', testData)
  .then(response => {
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  })
  .catch(error => {
    console.error('❌ Error:', error.response?.data || error.message);
  });

