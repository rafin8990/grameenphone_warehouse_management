# Authentication Module Documentation

## Overview
This authentication module provides JWT token-based authentication with access tokens and refresh tokens. It includes user registration, login, profile management, and token refresh functionality.

## Features
- ✅ User registration with password hashing
- ✅ User login with credential validation
- ✅ JWT access token generation (1 day expiry)
- ✅ JWT refresh token generation (365 days expiry)
- ✅ Token refresh endpoint
- ✅ Protected routes with middleware
- ✅ User profile management
- ✅ Role-based access control
- ✅ Input validation with Zod schemas
- ✅ Functional components (no class components)

## API Endpoints

### 1. User Registration
**POST** `/api/v1/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "mobile_no": "+1234567890",
  "password": "password123",
  "role": "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "mobile_no": "+1234567890",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. User Login
**POST** `/api/v1/auth/login`

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "mobile_no": "+1234567890",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get User Profile
**GET** `/api/v1/auth/profile`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "mobile_no": "+1234567890",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 4. Refresh Access Token
**POST** `/api/v1/auth/refresh-token`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  mobile_no VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=365d

# Password Hashing
BCRYPT_SALT_ROUNDS=12
```

## Middleware Usage

### Authentication Middleware
```typescript
import { auth } from '../middlewares/auth';

// Protect a route
router.get('/protected-route', auth, controller.protectedFunction);
```

### Role-based Access Control
```typescript
import { requireRole } from '../middlewares/auth';

// Require specific roles
router.get('/admin-only', auth, requireRole(['admin']), controller.adminFunction);
router.get('/manager-or-admin', auth, requireRole(['admin', 'manager']), controller.managerFunction);
```

### Optional Authentication
```typescript
import { optionalAuth } from '../middlewares/auth';

// Optional authentication (user info available if token is valid)
router.get('/optional-auth', optionalAuth, controller.optionalFunction);
```

## Error Handling

The module handles various error scenarios:

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid tokens
- **403 Forbidden**: Insufficient permissions
- **409 Conflict**: Username already exists
- **500 Internal Server Error**: Server errors

## Security Features

1. **Password Hashing**: Uses bcryptjs with configurable salt rounds
2. **JWT Tokens**: Secure token generation with expiration
3. **Input Validation**: Zod schemas for request validation
4. **SQL Injection Protection**: Parameterized queries
5. **Token Verification**: Middleware validates tokens on protected routes

## Testing

Run the authentication test:
```bash
cd Backend
node test-auth.js
```

## File Structure

```
Backend/src/app/modules/auth/
├── auth.controller.ts      # Controller functions
├── auth.interface.ts       # TypeScript interfaces
├── auth.routes.ts         # Route definitions
├── auth.service.ts        # Business logic
└── auth.validation.ts     # Zod validation schemas

Backend/src/app/middlewares/
└── auth.ts               # Authentication middleware
```

## Usage Examples

### Frontend Integration

```javascript
// Login
const login = async (username, password) => {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  return response.json();
};

// Get profile
const getProfile = async (accessToken) => {
  const response = await fetch('/api/v1/auth/profile', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  return response.json();
};

// Refresh token
const refreshToken = async (refreshToken) => {
  const response = await fetch('/api/v1/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });
  return response.json();
};
```

## Notes

- All endpoints return consistent response format
- Passwords are automatically hashed before storage
- Tokens include user ID, username, and role
- Refresh tokens can be used to get new access tokens
- The module is fully functional and ready for production use
