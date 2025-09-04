# RFID Module Implementation

## Overview
The RFID module has been successfully implemented with full CRUD operations following the same pattern as other modules in the application (categories, items, locations, etc.).

## Files Created

### 1. `src/app/modules/rfid/rfid.interface.ts`
- Defines the `IRfidTag` interface with the following fields:
  - `id?: number` - Primary key
  - `tag_uid: string` - Unique RFID tag identifier (max 64 characters)
  - `status: 'available' | 'reserved' | 'assigned' | 'consumed' | 'lost' | 'damaged'` - Tag status
  - `created_at?: Date` - Creation timestamp
  - `updated_at?: Date` - Last update timestamp

### 2. `src/app/modules/rfid/rfid.service.ts`
- Implements all CRUD operations:
  - `createRfidTag()` - Creates new RFID tag with default status 'available'
  - `getAllRfidTags()` - Retrieves all RFID tags with pagination and filtering
  - `getSingleRfidTag()` - Retrieves a single RFID tag by ID
  - `updateRfidTag()` - Updates an existing RFID tag
  - `deleteRfidTag()` - Deletes an RFID tag

### 3. `src/app/modules/rfid/rfid.controller.ts`
- Handles HTTP requests and responses:
  - `createRfidTag` - POST /rfid
  - `getAllRfidTags` - GET /rfid
  - `getSingleRfidTag` - GET /rfid/:id
  - `updateRfidTag` - PATCH /rfid/:id
  - `deleteRfidTag` - DELETE /rfid/:id

### 4. `src/app/modules/rfid/rfid.validation.ts`
- Implements Zod validation schemas for all operations:
  - Input validation for tag_uid (required, max 64 chars)
  - Status validation (enum of allowed values)
  - ID validation for single operations
  - Query parameter validation for list operations

### 5. `src/app/modules/rfid/rfid.route.ts`
- Defines all API endpoints with proper middleware:
  - Request validation using Zod schemas
  - Controller method mapping

## Key Features

### Default Status
- When creating a new RFID tag, the default status is set to 'available' as requested
- This is implemented in both the validation schema and service layer

### Status Values
The RFID tags support the following status values:
- `available` - Tag is ready for use
- `reserved` - Tag is reserved for future use
- `assigned` - Tag is assigned to an item
- `consumed` - Tag has been consumed/used
- `lost` - Tag is lost
- `damaged` - Tag is damaged

### API Endpoints

#### Create RFID Tag
```
POST /api/v1/rfid
Content-Type: application/json

{
  "tag_uid": "ABC123456789",
  "status": "available" // optional, defaults to "available"
}
```

#### Get All RFID Tags
```
GET /api/v1/rfid?page=1&limit=10&searchTerm=ABC&status=available
```

#### Get Single RFID Tag
```
GET /api/v1/rfid/1
```

#### Update RFID Tag
```
PATCH /api/v1/rfid/1
Content-Type: application/json

{
  "status": "assigned"
}
```

#### Delete RFID Tag
```
DELETE /api/v1/rfid/1
```

## Database Integration
- Uses the existing `rfid_tags` table created by migration `1756727138269_create_rfid_table.ts`
- Follows the same database connection pattern using the `pool` from `dbClient.ts`
- Implements proper transaction handling for create, update, and delete operations

## Error Handling
- Proper error handling with custom `ApiError` class
- HTTP status codes for different scenarios (404 for not found, 400 for bad request, etc.)
- Database constraint violation handling

## Integration
- RFID routes are registered in `src/app/routes/index.ts`
- Available at `/api/v1/rfid` endpoint
- Follows the same middleware pattern as other modules

## Testing
The module is ready for testing. You can use tools like Postman or curl to test the endpoints:

```bash
# Create a new RFID tag
curl -X POST http://localhost:3000/api/v1/rfid \
  -H "Content-Type: application/json" \
  -d '{"tag_uid": "TEST123456"}'

# Get all RFID tags
curl http://localhost:3000/api/v1/rfid

# Get a specific RFID tag
curl http://localhost:3000/api/v1/rfid/1

# Update an RFID tag
curl -X PATCH http://localhost:3000/api/v1/rfid/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "assigned"}'

# Delete an RFID tag
curl -X DELETE http://localhost:3000/api/v1/rfid/1
```
