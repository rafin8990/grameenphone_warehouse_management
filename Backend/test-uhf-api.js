// Test script to verify UHF API endpoints match Java code structure
const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testUHFAPI() {
  console.log('🧪 Testing UHF API Endpoints...\n');

  try {
    // Test 1: Send single UHF tag (matches Java sendUHFTag method)
    console.log('1️⃣ Testing POST /uhf/tags (single tag)...');
    const singleTagRequest = {
      epc: 'UHF123456789',
      rssi: '-45',
      count: 1,
      timestamp: Date.now(),
      deviceId: 'DEVICE001'
    };

    const response1 = await fetch(`${API_BASE_URL}/uhf/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(singleTagRequest)
    });

    const result1 = await response1.json();
    console.log('✅ Single UHF tag response:', {
      success: result1.success,
      message: result1.message,
      code: result1.code
    });

    // Test 2: Send batch UHF tags (matches Java sendUHFTagsBatch method)
    console.log('\n2️⃣ Testing POST /uhf/tags/batch (batch tags)...');
    const batchRequest = {
      tags: [
        {
          epc: 'UHF111111111',
          rssi: '-50',
          count: 2,
          timestamp: Date.now(),
          deviceId: 'DEVICE002'
        },
        {
          epc: 'UHF222222222',
          rssi: '-55',
          count: 1,
          timestamp: Date.now(),
          deviceId: 'DEVICE002'
        },
        {
          epc: 'UHF123456789', // Duplicate to test duplicate handling
          rssi: '-60',
          count: 1,
          timestamp: Date.now(),
          deviceId: 'DEVICE002'
        }
      ],
      sessionId: 'SESSION123'
    };

    const response2 = await fetch(`${API_BASE_URL}/uhf/tags/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchRequest)
    });

    const result2 = await response2.json();
    console.log('✅ Batch UHF tags response:', {
      success: result2.success,
      message: result2.message,
      code: result2.code
    });

    // Test 3: Get UHF tags (matches Java getUHFTags method)
    console.log('\n3️⃣ Testing GET /uhf/tags...');
    const response3 = await fetch(`${API_BASE_URL}/uhf/tags?page=1&limit=10`);
    const result3 = await response3.json();
    console.log('✅ Get UHF tags response:', {
      success: result3.success,
      message: result3.message,
      code: result3.code
    });

    // Test 4: Delete UHF tag (matches Java deleteUHFTag method)
    console.log('\n4️⃣ Testing DELETE /uhf/tags/{epc}...');
    const response4 = await fetch(`${API_BASE_URL}/uhf/tags/UHF111111111`, {
      method: 'DELETE'
    });
    const result4 = await response4.json();
    console.log('✅ Delete UHF tag response:', {
      success: result4.success,
      message: result4.message,
      code: result4.code
    });

    console.log('\n🎉 All UHF API tests completed!');
    console.log('\n📋 API Endpoints Summary:');
    console.log('   POST   /api/v1/uhf/tags        - Send single UHF tag');
    console.log('   POST   /api/v1/uhf/tags/batch  - Send batch UHF tags');
    console.log('   GET    /api/v1/uhf/tags        - Get UHF tags with pagination');
    console.log('   DELETE /api/v1/uhf/tags/{epc}  - Delete UHF tag by EPC');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testUHFAPI();
