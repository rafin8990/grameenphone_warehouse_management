const axios = require('axios');

async function quickTest() {
  console.log('🚀 Quick Status Toggle Test\n');

  const testData = {
    epc: 'QUICK123',
    po_number: 'PO002',
    item_number: 'ITEM002',
    location_code: 'LOC002',
    quantity: 1,
    deviceId: 'DEVICE002'
  };

  try {
    // Test 1: First scan
    console.log('1️⃣ First scan...');
    const response1 = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', testData);
    console.log('✅ Status:', response1.data.data?.status || 'No data');
    console.log('   Message:', response1.data.message);
    console.log();

    // Test 2: Immediate second scan (should be ignored)
    console.log('2️⃣ Immediate second scan (should be ignored)...');
    try {
      const response2 = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', testData);
      console.log('⚠️  Unexpected success:', response2.data.data?.status);
    } catch (error) {
      console.log('✅ Correctly ignored:', error.response?.data?.message || 'No message');
    }
    console.log();

    // Test 3: Wait 35 seconds and scan again (should toggle)
    console.log('3️⃣ Waiting 35 seconds for toggle test...');
    console.log('   (This will take 35 seconds...)');
    
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    console.log('   Scanning after 35 seconds...');
    const response3 = await axios.post('http://localhost:5000/api/v1/location-trackers/scan', testData);
    console.log('✅ Status after toggle:', response3.data.data?.status || 'No data');
    console.log('   Message:', response3.data.message);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

quickTest();
