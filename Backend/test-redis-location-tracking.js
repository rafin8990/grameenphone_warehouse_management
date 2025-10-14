const { locationTrackingRedis } = require('./src/services/locationTrackingRedis');

async function testRedisLocationTracking() {
  try {
    console.log('🧪 Testing Redis Location Tracking...\n');

    const testData = {
      epc: 'E200001234567890',
      po_number: 'PO123456',
      item_number: 'ITEM001',
      location_code: 'LOC001'
    };

    // Test 1: First scan (should be allowed)
    console.log('1. Testing first scan...');
    const firstScan = await locationTrackingRedis.canProcessScan(
      testData.epc,
      testData.po_number,
      testData.item_number,
      testData.location_code
    );
    console.log('✅ First scan result:', firstScan);

    if (firstScan.canProcess) {
      // Record the scan
      await locationTrackingRedis.recordScan(
        testData.epc,
        testData.po_number,
        testData.item_number,
        testData.location_code,
        'in'
      );
      console.log('✅ Recorded first scan as "in"');
    }

    // Test 2: Immediate second scan (should be blocked)
    console.log('\n2. Testing immediate second scan...');
    const secondScan = await locationTrackingRedis.canProcessScan(
      testData.epc,
      testData.po_number,
      testData.item_number,
      testData.location_code
    );
    console.log('✅ Second scan result:', secondScan);

    // Test 3: Check cooldown status
    console.log('\n3. Testing cooldown status...');
    const cooldownStatus = await locationTrackingRedis.getCooldownStatus(
      testData.epc,
      testData.po_number,
      testData.item_number,
      testData.location_code
    );
    console.log('✅ Cooldown status:', cooldownStatus);

    // Test 4: Get last status
    console.log('\n4. Testing last status...');
    const lastStatus = await locationTrackingRedis.getLastStatus(
      testData.epc,
      testData.po_number,
      testData.item_number,
      testData.location_code
    );
    console.log('✅ Last status:', lastStatus);

    // Test 5: Get all active tracking
    console.log('\n5. Testing all active tracking...');
    const allTracking = await locationTrackingRedis.getAllActiveTracking();
    console.log('✅ All active tracking:', allTracking);

    console.log('\n🎉 Redis location tracking test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRedisLocationTracking();
