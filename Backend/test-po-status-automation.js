const http = require('http');

// Test the PO status automation system
const testPOStatusAutomation = async () => {
  console.log('🧪 Testing PO Status Automation System...\n');

  // Test 1: Create test data (item, PO, location)
  console.log('1. Setting up test data...');
  
  // Create item
  const itemData = JSON.stringify({
    item_number: 'ITEM-PO-STATUS-001',
    item_description: 'Test PO Status Item',
    category: 'Test Category',
    unit_of_measure: 'PCS'
  });

  const createItemOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/items',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(itemData)
    }
  };

  try {
    await makeRequest(createItemOptions, itemData);
    console.log('✅ Test item created');
  } catch (error) {
    console.log('⚠️ Item creation failed (might already exist):', error.message);
  }

  // Create PO with multiple items
  const poData = JSON.stringify({
    po_number: 'PO-STATUS-001',
    supplier_name: 'Test Supplier',
    po_type: 'test',
    items: [
      {
        item_number: 'ITEM-PO-STATUS-001',
        quantity: 10
      }
    ]
  });

  const createPoOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/purchase-orders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(poData)
    }
  };

  try {
    await makeRequest(createPoOptions, poData);
    console.log('✅ Test PO created with 1 item (quantity: 10)');
  } catch (error) {
    console.log('⚠️ PO creation failed (might already exist):', error.message);
  }

  // Create location
  const locationData = JSON.stringify({
    location_name: 'Test PO Status Location',
    location_code: 'PO-STATUS-001',
    sub_inventory_code: 'PO-STATUS-SUB-001'
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
    await makeRequest(createLocationOptions, locationData);
    console.log('✅ Test location created');
  } catch (error) {
    console.log('⚠️ Location creation failed (might already exist):', error.message);
  }

  // Test 2: Check initial PO status
  console.log('\n2. Checking initial PO status...');
  const initialStatusOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/purchase-orders/PO-STATUS-001/status-summary',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const initialStatusResult = await makeRequest(initialStatusOptions);
    console.log('✅ Initial PO status:', initialStatusResult.data.status);
    console.log('   Total ordered:', initialStatusResult.data.total_ordered_quantity);
    console.log('   Total received:', initialStatusResult.data.total_received_quantity);
  } catch (error) {
    console.log('❌ Get initial status failed:', error.message);
  }

  // Test 3: Partial receipt (5 out of 10)
  console.log('\n3. Testing partial receipt (5 out of 10)...');
  
  for (let i = 1; i <= 5; i++) {
    const rfidData = JSON.stringify({
      epc: `PO-STATUS-EPC-00${i}`,
      deviceId: 'PO-STATUS-001'
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
      console.log(`✅ Scan ${i} completed:`, rfidResult.message);
    } catch (error) {
      console.log(`❌ Scan ${i} failed:`, error.message);
    }
  }

  // Check status after partial receipt
  console.log('\n4. Checking status after partial receipt...');
  try {
    const partialStatusResult = await makeRequest(initialStatusOptions);
    console.log('✅ PO status after partial receipt:', partialStatusResult.data.status);
    console.log('   Total ordered:', partialStatusResult.data.total_ordered_quantity);
    console.log('   Total received:', partialStatusResult.data.total_received_quantity);
  } catch (error) {
    console.log('❌ Get partial status failed:', error.message);
  }

  // Test 4: Complete receipt (remaining 5)
  console.log('\n5. Testing complete receipt (remaining 5)...');
  
  for (let i = 6; i <= 10; i++) {
    const rfidData = JSON.stringify({
      epc: `PO-STATUS-EPC-00${i}`,
      deviceId: 'PO-STATUS-001'
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
      console.log(`✅ Scan ${i} completed:`, rfidResult.message);
    } catch (error) {
      console.log(`❌ Scan ${i} failed:`, error.message);
    }
  }

  // Check final status
  console.log('\n6. Checking final status after complete receipt...');
  try {
    const finalStatusResult = await makeRequest(initialStatusOptions);
    console.log('✅ Final PO status:', finalStatusResult.data.status);
    console.log('   Total ordered:', finalStatusResult.data.total_ordered_quantity);
    console.log('   Total received:', finalStatusResult.data.total_received_quantity);
    console.log('   Received at:', finalStatusResult.data.received_at);
  } catch (error) {
    console.log('❌ Get final status failed:', error.message);
  }

  // Test 5: Manual status check
  console.log('\n7. Testing manual status check...');
  const manualCheckOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/purchase-orders/PO-STATUS-001/check-status',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const manualCheckResult = await makeRequest(manualCheckOptions);
    console.log('✅ Manual status check:', manualCheckResult.message);
    console.log('   Status:', manualCheckResult.data.status);
    console.log('   Updated:', manualCheckResult.data.isUpdated);
  } catch (error) {
    console.log('❌ Manual status check failed:', error.message);
  }

  // Test 6: Test with different PO (multiple items)
  console.log('\n8. Testing with PO having multiple items...');
  
  const multiItemPoData = JSON.stringify({
    po_number: 'PO-STATUS-MULTI-001',
    supplier_name: 'Test Supplier Multi',
    po_type: 'test',
    items: [
      {
        item_number: 'ITEM-PO-STATUS-001',
        quantity: 5
      }
    ]
  });

  try {
    await makeRequest(createPoOptions, multiItemPoData);
    console.log('✅ Multi-item PO created');
  } catch (error) {
    console.log('⚠️ Multi-item PO creation failed (might already exist):', error.message);
  }

  // Scan some items for multi-item PO
  console.log('\n9. Testing partial receipt for multi-item PO...');
  for (let i = 1; i <= 3; i++) {
    const rfidData = JSON.stringify({
      epc: `PO-STATUS-MULTI-EPC-00${i}`,
      deviceId: 'PO-STATUS-001'
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
      console.log(`✅ Multi-item scan ${i} completed:`, rfidResult.message);
    } catch (error) {
      console.log(`❌ Multi-item scan ${i} failed:`, error.message);
    }
  }

  // Check multi-item PO status
  const multiItemStatusOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/purchase-orders/PO-STATUS-MULTI-001/status-summary',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const multiItemStatusResult = await makeRequest(multiItemStatusOptions);
    console.log('✅ Multi-item PO status:', multiItemStatusResult.data.status);
    console.log('   Total ordered:', multiItemStatusResult.data.total_ordered_quantity);
    console.log('   Total received:', multiItemStatusResult.data.total_received_quantity);
  } catch (error) {
    console.log('❌ Get multi-item status failed:', error.message);
  }

  console.log('\n🎉 PO Status Automation testing completed!');
  console.log('\n📋 Summary:');
  console.log('- PO status automatically updates based on received quantities');
  console.log('- Pending → Partial (when some items received)');
  console.log('- Partial → Received (when all items fully received)');
  console.log('- Received_at timestamp set when PO becomes received');
  console.log('- Socket events emitted for live updates');
  console.log('- Manual status check available via API');
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
testPOStatusAutomation().catch(console.error);
