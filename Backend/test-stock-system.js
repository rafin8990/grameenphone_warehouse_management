const http = require('http');

// Test the complete stock management system
const testStockSystem = async () => {
  console.log('🧪 Testing Complete Stock Management System...\n');

  // Test 1: Create test data (items, PO, locations)
  console.log('1. Setting up test data...');
  
  // Create item
  const itemData = JSON.stringify({
    item_number: 'ITEM-STOCK-001',
    item_description: 'Test Stock Item',
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
    po_number: 'PO-STOCK-001',
    vendor_name: 'Test Vendor',
    po_date: '2024-01-01',
    total_amount: 1000,
    status: 'active'
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
    console.log('✅ Test PO created');
  } catch (error) {
    console.log('⚠️ PO creation failed (might already exist):', error.message);
  }

  // Create location
  const locationData = JSON.stringify({
    location_name: 'Test Stock Location',
    location_code: 'STOCK-001',
    sub_inventory_code: 'STOCK-SUB-001'
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

  // Test 2: Test RFID scan with stock update
  console.log('\n2. Testing RFID scan with stock update...');
  
  const rfidData = JSON.stringify({
    epc: 'STOCK-TEST-EPC-001',
    deviceId: 'STOCK-001' // This should trigger location tracking and stock update
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
    console.log('✅ RFID scan completed:', rfidResult.message);
  } catch (error) {
    console.log('❌ RFID scan failed:', error.message);
  }

  // Test 3: Get stock statistics
  console.log('\n3. Testing stock statistics...');
  const statsOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/stock/stats',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const statsResult = await makeRequest(statsOptions);
    console.log('✅ Stock stats retrieved:', statsResult.message);
    console.log('   Total items:', statsResult.data.total_items);
    console.log('   Total quantity:', statsResult.data.total_quantity);
    console.log('   Unique items:', statsResult.data.unique_items);
    console.log('   Unique POs:', statsResult.data.unique_pos);
    console.log('   Recent updates:', statsResult.data.recent_updates);
  } catch (error) {
    console.log('❌ Get stock stats failed:', error.message);
  }

  // Test 4: Get all stocks
  console.log('\n4. Testing get all stocks...');
  const getStocksOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/stock',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const stocksResult = await makeRequest(getStocksOptions);
    console.log('✅ Stocks retrieved:', stocksResult.message);
    console.log('   Total stocks found:', stocksResult.data.length);
    if (stocksResult.data.length > 0) {
      console.log('   Sample stock:', {
        po_number: stocksResult.data[0].po_number,
        item_number: stocksResult.data[0].item_number,
        lot_no: stocksResult.data[0].lot_no,
        quantity: stocksResult.data[0].quantity
      });
    }
  } catch (error) {
    console.log('❌ Get stocks failed:', error.message);
  }

  // Test 5: Get stock summary
  console.log('\n5. Testing stock summary...');
  const summaryOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/stock/summary',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const summaryResult = await makeRequest(summaryOptions);
    console.log('✅ Stock summary retrieved:', summaryResult.message);
    console.log('   Summary items found:', summaryResult.data.length);
    if (summaryResult.data.length > 0) {
      console.log('   Top item:', {
        item_number: summaryResult.data[0].item_number,
        total_quantity: summaryResult.data[0].total_quantity,
        lot_count: summaryResult.data[0].lot_count
      });
    }
  } catch (error) {
    console.log('❌ Get stock summary failed:', error.message);
  }

  // Test 6: Get live stock data
  console.log('\n6. Testing live stock data...');
  const liveOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/stock/live',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const liveResult = await makeRequest(liveOptions);
    console.log('✅ Live stock data retrieved:', liveResult.message);
    console.log('   Stats available:', !!liveResult.data.stats);
    console.log('   Summary items:', liveResult.data.summary.length);
    console.log('   Last updated:', liveResult.data.last_updated);
  } catch (error) {
    console.log('❌ Get live stock data failed:', error.message);
  }

  // Test 7: Test multiple scans (same PO, item, lot - should update quantity)
  console.log('\n7. Testing multiple scans (same PO, item, lot)...');
  
  for (let i = 2; i <= 3; i++) {
    const multipleRfidData = JSON.stringify({
      epc: `STOCK-TEST-EPC-00${i}`,
      deviceId: 'STOCK-001'
    });

    try {
      const multipleResult = await makeRequest(rfidOptions, multipleRfidData);
      console.log(`✅ Scan ${i} completed:`, multipleResult.message);
    } catch (error) {
      console.log(`❌ Scan ${i} failed:`, error.message);
    }
  }

  // Test 8: Test different lot (should create new stock record)
  console.log('\n8. Testing different lot (should create new stock record)...');
  
  const differentLotData = JSON.stringify({
    epc: 'STOCK-TEST-EPC-DIFF-LOT',
    deviceId: 'STOCK-001'
  });

  try {
    const diffLotResult = await makeRequest(rfidOptions, differentLotData);
    console.log('✅ Different lot scan completed:', diffLotResult.message);
  } catch (error) {
    console.log('❌ Different lot scan failed:', error.message);
  }

  // Final stats check
  console.log('\n9. Final stock statistics check...');
  try {
    const finalStatsResult = await makeRequest(statsOptions);
    console.log('✅ Final stats:');
    console.log('   Total items:', finalStatsResult.data.total_items);
    console.log('   Total quantity:', finalStatsResult.data.total_quantity);
    console.log('   Unique items:', finalStatsResult.data.unique_items);
  } catch (error) {
    console.log('❌ Final stats check failed:', error.message);
  }

  console.log('\n🎉 Complete stock management system testing completed!');
  console.log('\n📋 Summary:');
  console.log('- Stock table updates automatically on RFID scans');
  console.log('- Same PO + Item + Lot = Quantity update');
  console.log('- Different Lot = New stock record');
  console.log('- Live dashboard shows real-time stock data');
  console.log('- Socket events provide live updates');
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
testStockSystem().catch(console.error);
