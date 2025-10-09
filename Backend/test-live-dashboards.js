const http = require('http');
const io = require('socket.io-client');

const testLiveDashboards = async () => {
  console.log('🧪 Testing Live Dashboards Integration...\n');

  // Connect to socket
  const socket = io('http://localhost:5000');
  
  socket.on('connect', () => {
    console.log('✅ Connected to Socket.IO server');
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from Socket.IO server');
  });

  // Listen for all live events
  socket.on('inbound:new-scan', (data) => {
    console.log('📡 Received inbound:new-scan event:', {
      po_number: data.po_number,
      item_number: data.item_number,
      quantity: data.quantity,
      ordered_quantity: data.ordered_quantity,
      isDuplicate: data.isDuplicate || false
    });
  });

  socket.on('location-tracker:new', (data) => {
    console.log('📍 Received location-tracker:new event:', {
      location_code: data.location_code,
      location_name: data.location_name,
      po_number: data.po_number,
      item_number: data.item_number,
      status: data.status,
      quantity: data.quantity
    });
  });

  socket.on('stock:updated', (data) => {
    console.log('📦 Received stock:updated event:', {
      po_number: data.po_number,
      item_number: data.item_number,
      lot_no: data.lot_no,
      quantity: data.quantity
    });
  });

  socket.on('po:status-updated', (data) => {
    console.log('📋 Received po:status-updated event:', {
      po_number: data.po_number,
      status: data.status,
      total_ordered: data.total_ordered_quantity,
      total_received: data.total_received_quantity
    });
  });

  // Wait for socket connection
  await new Promise(resolve => {
    if (socket.connected) {
      resolve();
    } else {
      socket.on('connect', resolve);
    }
  });

  console.log('\n1. Setting up test data...');

  // Create test PO with hex codes
  const createTestPO = async () => {
    const poData = {
      po_number: 'LIVE-TEST-PO-001',
      po_description: 'Live Dashboard Test PO',
      supplier_name: 'Test Supplier',
      po_type: 'standard',
      po_items: [
        {
          item_number: 'LIVE-ITEM-001',
          quantity: 10
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
            resolve(); // Continue anyway
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
      location_name: 'Live Test Location',
      location_code: 'LIVE-LOC-001',
      sub_inventory_code: 'LIVE-SUB'
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
            resolve(); // Continue anyway
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(locationData));
      req.end();
    });
  };

  // Create hex codes for the PO
  const createHexCodes = async () => {
    const hexCodes = [
      { hex_code: 'LIVE-EPC-001', po_number: 'LIVE-TEST-PO-001', item_number: 'LIVE-ITEM-001', lot_no: 'LOT-001', quantity: 1 },
      { hex_code: 'LIVE-EPC-002', po_number: 'LIVE-TEST-PO-001', item_number: 'LIVE-ITEM-001', lot_no: 'LOT-001', quantity: 1 },
      { hex_code: 'LIVE-EPC-003', po_number: 'LIVE-TEST-PO-001', item_number: 'LIVE-ITEM-001', lot_no: 'LOT-001', quantity: 1 }
    ];

    for (const hexCode of hexCodes) {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/v1/po-hex-codes',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 201 || res.statusCode === 409) {
              resolve();
            } else {
              console.log(`⚠️ Hex code ${hexCode.hex_code} creation failed:`, data);
              resolve(); // Continue anyway
            }
          });
        });
        req.on('error', reject);
        req.write(JSON.stringify(hexCode));
        req.end();
      });
    }
    console.log('✅ Test hex codes ready');
  };

  await createTestPO();
  await createTestLocation();
  await createHexCodes();

  console.log('\n2. Testing RFID scans with live updates...\n');

  // Test RFID scans
  const testScans = [
    { epc: 'LIVE-EPC-001', deviceId: 'LIVE-LOC-001' },
    { epc: 'LIVE-EPC-002', deviceId: 'LIVE-LOC-001' },
    { epc: 'LIVE-EPC-003', deviceId: 'LIVE-LOC-001' }
  ];

  for (let i = 0; i < testScans.length; i++) {
    const scan = testScans[i];
    console.log(`\n📡 Scan ${i + 1}: ${scan.epc} at ${scan.deviceId}`);
    
    const scanData = {
      epc: scan.epc,
      deviceId: scan.deviceId,
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
            if (res.statusCode === 201) {
              console.log(`✅ Scan ${i + 1} successful`);
            } else {
              console.log(`❌ Scan ${i + 1} failed:`, data);
            }
            resolve();
          });
        });
        req.on('error', reject);
        req.write(JSON.stringify(scanData));
        req.end();
      });

      // Wait a bit between scans to see events
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`❌ Scan ${i + 1} error:`, error.message);
    }
  }

  console.log('\n3. Waiting for all events to be processed...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n4. Checking final dashboard data...');

  // Check stock data
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
      path: '/api/v1/location-trackers?limit=5',
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
      path: '/api/v1/purchase-orders/LIVE-TEST-PO-001/status-summary',
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

  console.log('\n🎉 Live Dashboard Testing Complete!');
  console.log('\n📊 Summary:');
  console.log('- All socket events should have been emitted');
  console.log('- Live dashboards should show real-time updates');
  console.log('- Check the frontend dashboards to see live data');

  socket.disconnect();
  process.exit(0);
};

testLiveDashboards().catch(console.error);
