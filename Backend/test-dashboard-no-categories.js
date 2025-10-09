const http = require('http');

const testDashboardAPI = async () => {
  console.log('🧪 Testing Dashboard API without categories...\n');

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/dashboard/data',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      try {
        const response = JSON.parse(data);
        console.log('Success:', response.success);
        if (response.success && response.data) {
          console.log('✅ Dashboard API working!');
          console.log('Metrics count:', response.data.metrics ? response.data.metrics.length : 0);
          if (response.data.metrics && response.data.metrics.length > 0) {
            console.log('Available metrics:');
            response.data.metrics.forEach((metric, index) => {
              console.log(`  ${index + 1}. ${metric.label}: ${metric.value}`);
            });
          }
        } else {
          console.log('❌ Dashboard API failed');
          console.log('Error:', response.message || 'Unknown error');
        }
      } catch (e) {
        console.log('❌ Error parsing response:', e.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
  });

  req.end();
};

testDashboardAPI();
