// Test script to demonstrate duplicate RFID checking
const API_BASE_URL = 'http://localhost:5000/api/v1/rfid';

async function testDuplicateChecking() {
  console.log('🧪 Testing RFID Duplicate Checking...\n');

  try {
    // Test 1: Create first RFID tag
    console.log('1️⃣ Creating first RFID tag...');
    const firstTag = {
      epc: 'TEST123456789',
      location: 'Main Gate',
      reader_id: 'READER001',
      status: 'Available'
    };

    const response1 = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firstTag)
    });

    if (response1.ok) {
      const result1 = await response1.json();
      console.log('✅ First tag created:', result1.data.epc);
    } else {
      const error1 = await response1.json();
      console.log('❌ Error creating first tag:', error1.message);
    }

    // Test 2: Try to create duplicate RFID tag
    console.log('\n2️⃣ Attempting to create duplicate RFID tag...');
    const duplicateTag = {
      epc: 'TEST123456789', // Same EPC as first tag
      location: 'Secondary Gate',
      reader_id: 'READER002',
      status: 'Available'
    };

    const response2 = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateTag)
    });

    if (response2.ok) {
      const result2 = await response2.json();
      console.log('✅ Duplicate tag created (unexpected):', result2.data.epc);
    } else {
      const error2 = await response2.json();
      console.log('✅ Duplicate prevented:', error2.message);
    }

    // Test 3: Check if EPC is duplicate
    console.log('\n3️⃣ Checking if EPC is duplicate...');
    const checkResponse = await fetch(`${API_BASE_URL}/check-duplicate/TEST123456789`);
    const checkResult = await checkResponse.json();
    console.log('🔍 Duplicate check result:', checkResult.data);

    // Test 4: Bulk create with duplicates
    console.log('\n4️⃣ Testing bulk create with duplicates...');
    const bulkTags = [
      {
        epc: 'BULK001',
        location: 'Gate A',
        reader_id: 'READER003',
        status: 'Available'
      },
      {
        epc: 'BULK002',
        location: 'Gate B',
        reader_id: 'READER004',
        status: 'Available'
      },
      {
        epc: 'TEST123456789', // Duplicate of first tag
        location: 'Gate C',
        reader_id: 'READER005',
        status: 'Available'
      },
      {
        epc: 'BULK003',
        location: 'Gate D',
        reader_id: 'READER006',
        status: 'Available'
      }
    ];

    const bulkResponse = await fetch(`${API_BASE_URL}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bulkTags)
    });

    if (bulkResponse.ok) {
      const bulkResult = await bulkResponse.json();
      console.log('📦 Bulk create result:');
      console.log(`   Created: ${bulkResult.data.summary.created}`);
      console.log(`   Duplicates: ${bulkResult.data.summary.duplicates}`);
      console.log(`   Errors: ${bulkResult.data.summary.errors}`);
      console.log(`   Duplicate EPCs: ${bulkResult.data.duplicates.join(', ')}`);
    } else {
      const bulkError = await bulkResponse.json();
      console.log('❌ Bulk create error:', bulkError.message);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the test
testDuplicateChecking();
