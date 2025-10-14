const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAuth() {
  try {
    console.log('🧪 Testing Authentication Module...\n');

    // Test 1: Register a new user
    console.log('1. Testing User Registration...');
    const registerData = {
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    };

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
    console.log('✅ Registration successful:', registerResponse.data.message);
    console.log('User ID:', registerResponse.data.data.user.id);
    console.log('Access Token:', registerResponse.data.data.accessToken.substring(0, 20) + '...');
    console.log('Refresh Token:', registerResponse.data.data.refreshToken.substring(0, 20) + '...\n');

    const { accessToken, refreshToken } = registerResponse.data.data;

    // Test 2: Login with the registered user
    console.log('2. Testing User Login...');
    const loginData = {
      username: 'testuser',
      password: 'password123'
    };

    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, loginData);
    console.log('✅ Login successful:', loginResponse.data.message);
    console.log('User:', loginResponse.data.data.user.name);
    console.log('Role:', loginResponse.data.data.user.role);
    console.log('Access Token:', loginResponse.data.data.accessToken.substring(0, 20) + '...\n');

    // Test 3: Get user profile (protected route)
    console.log('3. Testing Protected Route (Get Profile)...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Profile retrieved successfully:', profileResponse.data.message);
    console.log('User Profile:', profileResponse.data.data.user);
    console.log('');

    // Test 4: Test refresh token
    console.log('4. Testing Token Refresh...');
    const refreshResponse = await axios.post(`${BASE_URL}/auth/refresh-token`, {
      refreshToken: refreshToken
    });
    console.log('✅ Token refresh successful:', refreshResponse.data.message);
    console.log('New Access Token:', refreshResponse.data.data.accessToken.substring(0, 20) + '...');
    console.log('New Refresh Token:', refreshResponse.data.data.refreshToken.substring(0, 20) + '...\n');

    // Test 5: Test invalid credentials
    console.log('5. Testing Invalid Credentials...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        username: 'testuser',
        password: 'wrongpassword'
      });
    } catch (error) {
      console.log('✅ Invalid credentials handled correctly:', error.response.data.message);
    }
    console.log('');

    // Test 6: Test unauthorized access
    console.log('6. Testing Unauthorized Access...');
    try {
      await axios.get(`${BASE_URL}/auth/profile`);
    } catch (error) {
      console.log('✅ Unauthorized access handled correctly:', error.response.data.message);
    }
    console.log('');

    console.log('🎉 All authentication tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAuth();
