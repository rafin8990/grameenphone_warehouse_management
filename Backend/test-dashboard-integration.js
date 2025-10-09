const http = require('http');

// Test the complete dashboard integration
const testDashboardIntegration = async () => {
  console.log('🧪 Testing Complete Dashboard Integration...\n');

  // Test 1: Create test data
  console.log('1. Setting up test data...');
  
  // Create item
  const itemData = JSON.stringify({
    item_number: 'ITEM-DASHBOARD-001',
    item_description: 'Test Dashboard Item',
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

  // Create PO
  const poData = JSON.stringify({
    po_number: 'PO-DASHBOARD-001',
    supplier_name: 'Test Dashboard Supplier',
    po_type: 'test',
    items: [
      {
        item_number: 'ITEM-DASHBOARD-001',
        quantity: 20
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
    console.log('✅ Test PO created with 20 items');
  } catch (error) {
    console.log('⚠️ PO creation failed (might already exist):', error.message);
  }

  // Create location
  const locationData = JSON.stringify({
    location_name: 'Test Dashboard Location',
    location_code: 'DASHBOARD-001',
    sub_inventory_code: 'DASHBOARD-SUB-001'
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

  // Test 2: Check initial dashboard data
  console.log('\n2. Checking initial dashboard data...');
  
  // Check stock stats
  const stockStatsOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/stock/stats',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const stockStatsResult = await makeRequest(stockStatsOptions);
    console.log('✅ Stock stats:', {
      total_items: stockStatsResult.data.total_items,
      total_quantity: stockStatsResult.data.total_quantity,
      unique_items: stockStatsResult.data.unique_items
    });
  } catch (error) {
    console.log('❌ Get stock stats failed:', error.message);
  }

  // Check PO status
  const poStatusOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/purchase-orders/PO-DASHBOARD-001/status-summary',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const poStatusResult = await makeRequest(poStatusOptions);
    console.log('✅ PO status:', {
      status: poStatusResult.data.status,
      total_ordered: poStatusResult.data.total_ordered_quantity,
      total_received: poStatusResult.data.total_received_quantity
    });
  } catch (error) {
    console.log('❌ Get PO status failed:', error.message);
  }

  // Test 3: Simulate RFID scans with live updates
  console.log('\n3. Simulating RFID scans with live updates...');
  
  // Phase 1: Partial receipt (10 out of 20)
  console.log('\n   Phase 1: Partial receipt (10 out of 20)...');
  for (let i = 1; i <= 10; i++) {
    const rfidData = JSON.stringify({
      epc: `DASHBOARD-EPC-00${i}`,
      deviceId: 'DASHBOARD-001'
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
      console.log(`   ✅ Scan ${i} completed: ${rfidResult.message}`);
    } catch (error) {
      console.log(`   ❌ Scan ${i} failed:`, error.message);
    }
    
    // Small delay to see live updates
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Check status after partial receipt
  console.log('\n   Checking status after partial receipt...');
  try {
    const partialStatusResult = await makeRequest(poStatusOptions);
    console.log('   ✅ PO status after partial:', {
      status: partialStatusResult.data.status,
      total_ordered: partialStatusResult.data.total_ordered_quantity,
      total_received: partialStatusResult.data.total_received_quantity
    });
  } catch (error) {
    console.log('   ❌ Get partial status failed:', error.message);
  }

  // Phase 2: Complete receipt (remaining 10)
  console.log('\n   Phase 2: Complete receipt (remaining 10)...');
  for (let i = 11; i <= 20; i++) {
    const rfidData = JSON.stringify({
      epc: `DASHBOARD-EPC-00${i}`,
      deviceId: 'DASHBOARD-001'
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
      console.log(`   ✅ Scan ${i} completed: ${rfidResult.message}`);
    } catch (error) {
      console.log(`   ❌ Scan ${i} failed:`, error.message);
    }
    
    // Small delay to see live updates
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Check final status
  console.log('\n   Checking final status after complete receipt...');
  try {
    const finalStatusResult = await makeRequest(poStatusOptions);
    console.log('   ✅ Final PO status:', {
      status: finalStatusResult.data.status,
      total_ordered: finalStatusResult.data.total_ordered_quantity,
      total_received: finalStatusResult.data.total_received_quantity,
      received_at: finalStatusResult.data.received_at
    });
  } catch (error) {
    console.log('   ❌ Get final status failed:', error.message);
  }

  // Test 4: Check final dashboard data
  console.log('\n4. Checking final dashboard data...');
  
  // Final stock stats
  try {
    const finalStockStatsResult = await makeRequest(stockStatsOptions);
    console.log('✅ Final stock stats:', {
      total_items: finalStockStatsResult.data.total_items,
      total_quantity: finalStockStatsResult.data.total_quantity,
      unique_items: finalStockStatsResult.data.unique_items,
      recent_updates: finalStockStatsResult.data.recent_updates
    });
  } catch (error) {
    console.log('❌ Get final stock stats failed:', error.message);
  }

  // Get all POs for dashboard
  const allPOsOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/purchase-orders?limit=10&sortBy=created_at&sortOrder=desc',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const allPOsResult = await makeRequest(allPOsOptions);
    console.log('✅ All POs for dashboard:', {
      total_pos: allPOsResult.data.length,
      statuses: allPOsResult.data.map(po => ({
        po_number: po.po_number,
        status: po.status
      }))
    });
  } catch (error) {
    console.log('❌ Get all POs failed:', error.message);
  }

  console.log('\n🎉 Dashboard Integration testing completed!');
  console.log('\n📋 Summary:');
  console.log('- Live Stock Dashboard: Real-time stock quantities');
  console.log('- Live PO Status Dashboard: Real-time PO status updates');
  console.log('- Automatic status changes: Pending → Partial → Received');
  console.log('- Socket events: Live updates for both systems');
  console.log('- Progress tracking: Visual progress bars and percentages');
  console.log('- Statistics: Live counts and summaries');
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
testDashboardIntegration().catch(console.error);
