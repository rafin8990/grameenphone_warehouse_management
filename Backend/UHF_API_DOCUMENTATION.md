# UHF API Documentation

This document describes the UHF API endpoints that match your Java code structure.

## Base URL
```
http://localhost:5000/api/v1
```

## API Endpoints

### 1. Send Single UHF Tag
**POST** `/uhf/tags`

Matches Java method: `sendUHFTag()`

**Request Body:**
```json
{
  "epc": "UHF123456789",
  "rssi": "-45",
  "count": 1,
  "timestamp": 1703123456789,
  "deviceId": "DEVICE001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "UHF tag with EPC 'UHF123456789' created successfully",
  "data": "{\"id\":1,\"epc\":\"UHF123456789\",\"rssi\":\"-45\",\"count\":1,\"timestamp\":\"2023-12-21T10:30:56.789Z\",\"device_id\":\"DEVICE001\",\"status\":\"Available\",\"created_at\":\"2023-12-21T10:30:56.789Z\",\"updated_at\":\"2023-12-21T10:30:56.789Z\"}",
  "code": 201
}
```

### 2. Send Batch UHF Tags
**POST** `/uhf/tags/batch`

Matches Java method: `sendUHFTagsBatch()`

**Request Body:**
```json
{
  "tags": [
    {
      "epc": "UHF111111111",
      "rssi": "-50",
      "count": 2,
      "timestamp": 1703123456789,
      "deviceId": "DEVICE002"
    },
    {
      "epc": "UHF222222222",
      "rssi": "-55",
      "count": 1,
      "timestamp": 1703123456790,
      "deviceId": "DEVICE002"
    }
  ],
  "sessionId": "SESSION123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Batch processed: 2 created, 0 duplicates, 0 errors",
  "data": "{\"created\":[...],\"duplicates\":[],\"errors\":[],\"summary\":{\"total\":2,\"created\":2,\"duplicates\":0,\"errors\":0}}",
  "code": 201
}
```

### 3. Get UHF Tags
**GET** `/uhf/tags?page=1&limit=10`

Matches Java method: `getUHFTags()`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Retrieved 10 UHF tags",
  "data": "{\"tags\":[...],\"pagination\":{\"page\":1,\"limit\":10,\"total\":25,\"totalPages\":3}}",
  "code": 200
}
```

### 4. Delete UHF Tag
**DELETE** `/uhf/tags/{epc}`

Matches Java method: `deleteUHFTag()`

**Path Parameters:**
- `epc`: The EPC of the tag to delete

**Response:**
```json
{
  "success": true,
  "message": "UHF tag with EPC 'UHF123456789' deleted successfully",
  "data": null,
  "code": 200
}
```

## Database Schema

The `rfid_tags` table has been updated with UHF-specific fields:

```sql
CREATE TABLE rfid_tags (
    id SERIAL PRIMARY KEY,
    epc VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location VARCHAR(100),
    reader_id VARCHAR(50),
    status VARCHAR(16) NOT NULL DEFAULT 'Available',
    rssi VARCHAR(20),                    -- New UHF field
    count INTEGER DEFAULT 1,             -- New UHF field
    device_id VARCHAR(100),              -- New UHF field
    session_id VARCHAR(100),             -- New UHF field
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Java Code Integration

Your Java code can now directly use these endpoints:

```java
// In your ApiService interface, update the base URL:
private static final String BASE_URL = "http://localhost:5000/api/v1/";

// The existing Java methods will work with these endpoints:
// - sendUHFTag() -> POST /uhf/tags
// - sendUHFTagsBatch() -> POST /uhf/tags/batch
// - getUHFTags() -> GET /uhf/tags
// - deleteUHFTag() -> DELETE /uhf/tags/{epc}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "code": 400
}
```

## Duplicate Prevention

- Single tag creation: Returns 409 Conflict if EPC already exists
- Batch creation: Reports duplicates in the response without failing the entire batch
- All operations use database transactions for consistency

## Testing

Use the provided test script:
```bash
node test-uhf-api.js
```

This will test all UHF API endpoints and verify they work correctly with your Java code structure.
