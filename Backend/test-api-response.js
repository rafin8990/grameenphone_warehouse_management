const http = require('http');

const testAPIResponse = async () => {
  console.log('🧪 Testing API Response...\n');

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/v1/purchase-orders?limit=5',
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
        if (response.data && response.data.length > 0) {
          console.log('First PO:', {
            po_number: response.data[0].po_number,
            status: response.data[0].status,
            created_at: response.data[0].created_at,
            received_at: response.data[0].received_at
          });
        } else {
          console.log('No data found');
        }
      } catch (e) {
        console.log('Response data:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e.message);
  });

  req.end();
};

testAPIResponse();
