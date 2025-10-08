# Inbound System - Complete Documentation

## 🎯 Overview

RFID gun থেকে EPC code scan করে automatic inbound processing system। Complex logic সহ quantity aggregation এবং duplicate prevention।

## 📊 Database Tables

### 1. `inbound` Table
```sql
CREATE TABLE inbound (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(100) NOT NULL,
  items JSONB NOT NULL,  -- Array of items
  received_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. `processed_epcs` Table (Auto-created)
```sql
CREATE TABLE processed_epcs (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(100) NOT NULL,
  epc VARCHAR(255) NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(po_number, epc)
);
```

## 🔄 Processing Flow

### Input (From RFID Gun)
```json
{
  "epc": "E20000123456789012345678",
  "rssi": "-45",
  "count": 1,
  "timestamp": 1703123456789,
  "deviceId": "device_001"
}
```

### Processing Steps

```
1. Receive EPC from gun
   ↓
2. Search po_hex_codes table WHERE hex_code = epc
   ↓
3. Get: po_number, lot_no, item_number, quantity
   ↓
4. Search items table WHERE item_number = item_number
   ↓
5. Get: item_description
   ↓
6. Check if inbound record exists for this po_number
   ↓
   ┌─────────────────────────────────────────┐
   │ Case 1: No inbound record exists        │
   ├─────────────────────────────────────────┤
   │ → Create new inbound record             │
   │ → Add first item to items JSON          │
   │ → Mark EPC as processed                 │
   └─────────────────────────────────────────┘
   │
   ┌─────────────────────────────────────────┐
   │ Case 2: Inbound record exists           │
   ├─────────────────────────────────────────┤
   │ → Check if EPC already processed        │
   │   ├─ YES: Skip (return existing)        │
   │   └─ NO: Continue ↓                     │
   │                                          │
   │ → Check if item_number exists in JSON   │
   │   ├─ YES: Increase quantity             │
   │   └─ NO: Add new item object            │
   │                                          │
   │ → Update inbound record                 │
   │ → Mark EPC as processed                 │
   └─────────────────────────────────────────┘
```

## 💡 Logic Examples

### Example 1: First Scan (New PO)
**Scan 1:**
```json
Input: { "epc": "A1B2C3D4E5F60718" }
↓
po_hex_codes match: { po_number: "GP-2025-001", item_number: "500497359", quantity: 1000 }
↓
items table: { item_description: "Smart Card Type A" }
↓
Result: Create new inbound
{
  "po_number": "GP-2025-001",
  "items": [
    {
      "item_number": "500497359",
      "item_description": "Smart Card Type A",
      "lot_no": "LOT-001",
      "quantity": 1000
    }
  ],
  "received_at": "2025-10-08"
}
```

### Example 2: Second Scan (Same PO, Different Item)
**Scan 2:**
```json
Input: { "epc": "1F2E3D4C5B6A7980" }
↓
po_hex_codes match: { po_number: "GP-2025-001", item_number: "500180440", quantity: 5000 }
↓
items table: { item_description: "Cable Type B" }
↓
Result: Update existing inbound - ADD new item
{
  "po_number": "GP-2025-001",
  "items": [
    {
      "item_number": "500497359",
      "item_description": "Smart Card Type A",
      "lot_no": "LOT-001",
      "quantity": 1000
    },
    {
      "item_number": "500180440",  // ← NEW ITEM ADDED
      "item_description": "Cable Type B",
      "lot_no": "LOT-002",
      "quantity": 5000
    }
  ],
  "received_at": "2025-10-08"
}
```

### Example 3: Third Scan (Same PO, Same Item, Different EPC)
**Scan 3:**
```json
Input: { "epc": "9C8D7E6F5A4B3210" }
↓
po_hex_codes match: { po_number: "GP-2025-001", item_number: "500497359", quantity: 1000 }
↓
Same item_number as first scan!
↓
Result: Update existing inbound - INCREASE quantity
{
  "po_number": "GP-2025-001",
  "items": [
    {
      "item_number": "500497359",
      "item_description": "Smart Card Type A",
      "lot_no": "LOT-001",
      "quantity": 2000  // ← INCREASED from 1000 to 2000
    },
    {
      "item_number": "500180440",
      "item_description": "Cable Type B",
      "lot_no": "LOT-002",
      "quantity": 5000
    }
  ],
  "received_at": "2025-10-08"
}
```

### Example 4: Re-scan Same EPC
**Scan 4:**
```json
Input: { "epc": "A1B2C3D4E5F60718" }  // Same as Scan 1
↓
Check processed_epcs table
↓
EPC already processed for GP-2025-001
↓
Result: SKIP - Return existing record without changes
```

## 🎯 Business Rules

### Rule 1: Duplicate EPC Prevention ✅
- Same EPC scanned twice for same PO → **Ignored**
- Tracked in `processed_epcs` table
- Prevents double-counting

### Rule 2: Quantity Aggregation ✅
- Same item_number, different EPC → **Add quantities**
- Example: 1000 + 1000 = 2000
- Updates existing item in JSON

### Rule 3: Multiple Items per PO ✅
- Different items → **Add to JSON array**
- All items under same po_number grouped together
- Single inbound record per PO

### Rule 4: Hex Code Immutability ✅
- Hex codes in po_hex_codes table used for matching
- Cannot be changed
- Permanent reference

## 📡 API Endpoints

### Process RFID Scan
```
POST /api/v1/inbound/scan

Request:
{
  "epc": "A1B2C3D4E5F60718",
  "rssi": "-45",
  "count": 1,
  "timestamp": 1703123456789,
  "deviceId": "device_001"
}

Response:
{
  "success": true,
  "message": "RFID scan processed successfully",
  "data": {
    "id": 1,
    "po_number": "GP-2025-001",
    "items": [
      {
        "item_number": "500497359",
        "item_description": "Smart Card Type A",
        "lot_no": "LOT-001",
        "quantity": 1000
      }
    ],
    "received_at": "2025-10-08",
    "created_at": "2025-10-08T10:30:00Z",
    "updated_at": "2025-10-08T10:30:00Z"
  }
}
```

### Get All Inbounds
```
GET /api/v1/inbound?page=1&limit=10

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "po_number": "GP-2025-001",
      "items": [...],
      "received_at": "2025-10-08"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

### Get Single Inbound
```
GET /api/v1/inbound/:id
```

### Update Inbound
```
PATCH /api/v1/inbound/:id

{
  "received_at": "2025-10-09"
}
```

### Delete Inbound
```
DELETE /api/v1/inbound/:id
```

## 🔒 Data Integrity

### Transaction Support ✅
- All operations wrapped in BEGIN...COMMIT
- Rollback on error
- ACID compliant

### Duplicate Prevention ✅
- `processed_epcs` table with UNIQUE constraint
- ON CONFLICT DO NOTHING

### Validation ✅
- EPC must exist in po_hex_codes
- Item must exist in items table
- All fields validated

## 📋 Complete Example Scenario

**Setup:**
```sql
-- po_hex_codes table
| hex_code         | po_number    | item_number | lot_no   | quantity |
|------------------|--------------|-------------|----------|----------|
| A1B2C3D4E5F60718 | GP-2025-001  | 500497359   | LOT-001  | 1000     |
| 1F2E3D4C5B6A7980 | GP-2025-001  | 500180440   | LOT-002  | 5000     |
| 9C8D7E6F5A4B3210 | GP-2025-001  | 500497359   | LOT-001  | 1000     |
```

**Scan Sequence:**

**Scan 1: EPC = A1B2C3D4E5F60718**
```json
// Creates inbound record
{
  "po_number": "GP-2025-001",
  "items": [
    { "item_number": "500497359", "quantity": 1000, "lot_no": "LOT-001" }
  ]
}
```

**Scan 2: EPC = 1F2E3D4C5B6A7980**
```json
// Updates inbound - adds new item
{
  "po_number": "GP-2025-001",
  "items": [
    { "item_number": "500497359", "quantity": 1000, "lot_no": "LOT-001" },
    { "item_number": "500180440", "quantity": 5000, "lot_no": "LOT-002" }  // NEW
  ]
}
```

**Scan 3: EPC = 9C8D7E6F5A4B3210**
```json
// Updates inbound - increases quantity (same item_number)
{
  "po_number": "GP-2025-001",
  "items": [
    { "item_number": "500497359", "quantity": 2000, "lot_no": "LOT-001" },  // 1000+1000
    { "item_number": "500180440", "quantity": 5000, "lot_no": "LOT-002" }
  ]
}
```

**Scan 4: EPC = A1B2C3D4E5F60718 (Duplicate)**
```json
// SKIPPED - EPC already processed
// Returns existing record unchanged
```

## 🚀 How to Use

### From RFID Gun
```bash
POST http://localhost:5000/api/v1/inbound/scan

{
  "epc": "A1B2C3D4E5F60718"
}
```

### Response
```json
{
  "statusCode": 201,
  "success": true,
  "message": "RFID scan processed successfully",
  "data": {
    "id": 1,
    "po_number": "GP-2025-001",
    "items": [
      {
        "item_number": "500497359",
        "item_description": "Smart Card Type A",
        "lot_no": "LOT-001",
        "quantity": 1000
      }
    ],
    "received_at": "2025-10-08"
  }
}
```

## ✅ Features

- ✅ Auto-match EPC with hex_code
- ✅ Get item details from items table
- ✅ Group items by po_number
- ✅ Aggregate quantities for same items
- ✅ Prevent duplicate EPC processing
- ✅ Transaction support
- ✅ Full error handling
- ✅ CRUD operations
- ✅ Pagination support

## 📁 Files Created

1. ✅ `inbound.interface.ts` - TypeScript interfaces
2. ✅ `inbound.service.ts` - Business logic with complex processing
3. ✅ `inbound.controller.ts` - Request handlers
4. ✅ `inbound.validation.ts` - Zod validation schemas
5. ✅ `inbound.route.ts` - API routes
6. ✅ `routes/index.ts` - Route registration

## 🎯 Key Endpoint

**`POST /api/v1/inbound/scan`** - Main endpoint for RFID gun

This endpoint handles all the complex logic automatically! 🚀

