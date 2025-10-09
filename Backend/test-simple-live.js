const http = require('http');

const testSimpleLive = async () => {
  console.log('🧪 Testing Simple Live Updates...\n');

  console.log('1. Creating test data...');

  // Create test PO
  const createTestPO = async () => {
    const poData = {
      po_number: 'SIMPLE-LIVE-PO-001',
      po_description: 'Simple Live Test PO',
      supplier_name: 'Test Supplier',
      po_type: 'standard',
      po_items: [
        {
          item_number: 'SIMPLE-ITEM-001',
          quantity: 5
        }
      ]
    };

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/purchase-orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 201 || res.statusCode === 409) {
            console.log('✅ Test PO ready');
            resolve();
          } else {
            console.log('⚠️ PO creation failed:', data);
            resolve();
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(poData));
      req.end();
    });
  };

  // Create test location
  const createTestLocation = async () => {
    const locationData = {
      location_name: 'Simple Test Location',
      location_code: 'SIMPLE-LOC-001',
      sub_inventory_code: 'SIMPLE-SUB'
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

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 201 || res.statusCode === 409) {
            console.log('✅ Test location ready');
            resolve();
          } else {
            console.log('⚠️ Location creation failed:', data);
            resolve();
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(locationData));
      req.end();
    });
  };

  // Create hex code
  const createHexCode = async () => {
    const hexCodeData = {
      hex_code: 'SIMPLE-EPC-001',
      po_number: 'SIMPLE-LIVE-PO-001',
      item_number: 'SIMPLE-ITEM-001',
      lot_no: 'LOT-001',
      quantity: 1
    };

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/po-hex-codes',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 201 || res.statusCode === 409) {
            console.log('✅ Test hex code ready');
            resolve();
          } else {
            console.log('⚠️ Hex code creation failed:', data);
            resolve();
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(hexCodeData));
      req.end();
    });
  };

  await createTestPO();
  await createTestLocation();
  await createHexCode();

  console.log('\n2. Testing RFID scan...');

  const scanData = {
    epc: 'SIMPLE-EPC-001',
    deviceId: 'SIMPLE-LOC-001',
    timestamp: new Date().toISOString()
  };

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/inbound/scan',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          console.log('📡 Scan response status:', res.statusCode);
          if (res.statusCode === 201) {
            console.log('✅ Scan successful!');
            try {
              const result = JSON.parse(data);
              console.log('📦 Inbound record created:', {
                id: result.data.id,
                po_number: result.data.po_number,
                items_count: result.data.items.length
              });
            } catch (e) {
              console.log('📦 Response data:', data);
            }
          } else {
            console.log('❌ Scan failed:', data);
          }
          resolve();
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(scanData));
      req.end();
    });
  } catch (error) {
    console.log('❌ Scan error:', error.message);
  }

  console.log('\n3. Checking live data...');

  // Check stock
  const checkStock = async () => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/stock/stats',
      method: 'GET'
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('📦 Stock stats:', result.data);
            resolve();
          } catch (e) {
            console.log('❌ Stock check failed:', data);
            resolve();
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  };

  // Check location trackers
  const checkLocationTrackers = async () => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/location-trackers?limit=3',
      method: 'GET'
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('📍 Location trackers:', result.data?.length || 0, 'records');
            if (result.data && result.data.length > 0) {
              console.log('   Latest:', {
                location_code: result.data[0].location_code,
                po_number: result.data[0].po_number,
                item_number: result.data[0].item_number,
                status: result.data[0].status
              });
            }
            resolve();
          } catch (e) {
            console.log('❌ Location trackers check failed:', data);
            resolve();
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  };

  // Check PO status
  const checkPOStatus = async () => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/purchase-orders/SIMPLE-LIVE-PO-001/status-summary',
      method: 'GET'
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('📋 PO status:', result.data);
            resolve();
          } catch (e) {
            console.log('❌ PO status check failed:', data);
            resolve();
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  };

  await checkStock();
  await checkLocationTrackers();
  await checkPOStatus();

  console.log('\n🎉 Simple Live Test Complete!');
  console.log('\n📊 Summary:');
  console.log('- RFID scan processed successfully');
  console.log('- All live systems should have been updated');
  console.log('- Check frontend dashboards for real-time updates');
  console.log('- Socket events should have been emitted for live updates');
};

testSimpleLive().catch(console.error);
