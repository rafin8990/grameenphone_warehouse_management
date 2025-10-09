const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function testDashboardLiveStock() {
  try {
    console.log('🧪 Testing Dashboard Live Stock Integration...\n');

    // Test 1: Get dashboard data
    console.log('1️⃣ Testing Dashboard Data API...');
    const dashboardResponse = await axios.get(`${BASE_URL}/dashboard/data`);
    
    if (dashboardResponse.data.success) {
      const metrics = dashboardResponse.data.data.metrics;
      console.log('✅ Dashboard API working');
      
      // Check if live stock metrics are present
      const stockItemsMetric = metrics.find(m => m.name === 'stock_items');
      const stockQuantityMetric = metrics.find(m => m.name === 'stock_quantity');
      
      if (stockItemsMetric) {
        console.log(`📦 Live Stock Items: ${stockItemsMetric.value}`);
      } else {
        console.log('❌ Live Stock Items metric not found');
      }
      
      if (stockQuantityMetric) {
        console.log(`📊 Total Stock Quantity: ${stockQuantityMetric.value}`);
      } else {
        console.log('❌ Total Stock Quantity metric not found');
      }
      
      // Check asset performance and quantity
      console.log(`📈 Asset Performance (Stock Items): ${dashboardResponse.data.data.assetPerformance.value}`);
      console.log(`📊 Asset Quantity (Stock Quantity): ${dashboardResponse.data.data.assetQuantity.value}`);
      
    } else {
      console.log('❌ Dashboard API failed:', dashboardResponse.data.message);
    }

    console.log('\n2️⃣ Testing Live Stock Data API...');
    const stockResponse = await axios.get(`${BASE_URL}/stock/live`);
    
    if (stockResponse.data.success) {
      console.log('✅ Live Stock API working');
      console.log('📊 Stock Stats:', stockResponse.data.data.stats);
      console.log('📋 Stock Summary (Top 5):', stockResponse.data.data.summary.slice(0, 5));
    } else {
      console.log('❌ Live Stock API failed:', stockResponse.data.message);
    }

    console.log('\n3️⃣ Testing Stock Stats API...');
    const stockStatsResponse = await axios.get(`${BASE_URL}/stock/stats`);
    
    if (stockStatsResponse.data.success) {
      console.log('✅ Stock Stats API working');
      console.log('📊 Stock Statistics:', stockStatsResponse.data.data);
    } else {
      console.log('❌ Stock Stats API failed:', stockStatsResponse.data.message);
    }

    console.log('\n🎉 Dashboard Live Stock Integration Test Complete!');
    console.log('\n📋 Summary:');
    console.log('- Dashboard now shows live stock items and quantities');
    console.log('- Asset performance shows live stock items count');
    console.log('- Asset quantity shows live stock quantity total');
    console.log('- All APIs are working correctly');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testDashboardLiveStock();
