const http = require('http');

// Test the dashboard API endpoint
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/dashboard/data',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  }
};

console.log('Testing dashboard API...');
console.log('URL: http://localhost:5000/api/v1/dashboard/data');

const req = http.request(options, (res) => {
  console.log(`\nStatus: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.data && jsonData.data.metrics) {
        console.log('\n--- Metrics Summary ---');
        jsonData.data.metrics.forEach(metric => {
          console.log(`${metric.label}: ${metric.value}`);
        });
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`\nProblem with request: ${e.message}`);
  console.log('\nMake sure the backend server is running on port 5000');
  console.log('Run: cd Backend && npm run dev');
});

req.setTimeout(5000, () => {
  console.log('\nRequest timeout - server might not be running');
  req.destroy();
});

req.end();
