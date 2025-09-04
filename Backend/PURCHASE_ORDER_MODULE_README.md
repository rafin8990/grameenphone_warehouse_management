# Purchase Order Module Implementation

## Overview
The Purchase Order module has been successfully implemented with full CRUD operations including the ability to manage PO items and RFID associations. The module follows the same pattern as other modules in the application and handles complex relationships between purchase orders, items, and RFID tags.

## Database Tables
The module works with three related tables:
1. **`purchase_orders`** - Main purchase order information
2. **`po_items`** - Items within each purchase order
3. **`po_items_rfid`** - RFID tags associated with specific PO items

## Files Created

### 1. `src/app/modules/purchase-orders/purchase-orders.interface.ts`
- Defines interfaces for all entities:
  - `IPurchaseOrder` - Main purchase order
  - `IPoItem` - Purchase order item
  - `IPoItemRfid` - RFID association with PO items
  - Extended interfaces for relationships and CRUD operations

### 2. `src/app/modules/purchase-orders/purchase-orders.service.ts`
- Implements all CRUD operations with transaction support:
  - `createPurchaseOrder()` - Creates PO with items and RFID tags
  - `getAllPurchaseOrders()` - Retrieves all POs with pagination
  - `getSinglePurchaseOrder()` - Gets basic PO information
  - `getSinglePurchaseOrderComplete()` - Gets PO with items and RFID
  - `updatePurchaseOrder()` - Updates PO and manages related data
  - `deletePurchaseOrder()` - Deletes PO (cascades to items and RFID)

### 3. `src/app/modules/purchase-orders/purchase-orders.controller.ts`
- Handles HTTP requests and responses:
  - `createPurchaseOrder` - POST /purchase-orders
  - `getAllPurchaseOrders` - GET /purchase-orders
  - `getSinglePurchaseOrder` - GET /purchase-orders/:id
  - `getSinglePurchaseOrderComplete` - GET /purchase-orders/:id/complete
  - `updatePurchaseOrder` - PATCH /purchase-orders/:id
  - `deletePurchaseOrder` - DELETE /purchase-orders/:id

### 4. `src/app/modules/purchase-orders/purchase-orders.validation.ts`
- Implements Zod validation schemas for all operations:
  - Input validation for PO fields
  - Item validation with nested RFID validation
  - Proper type checking and constraints

### 5. `src/app/modules/purchase-orders/purchase-orders.route.ts`
- Defines all API endpoints with proper middleware and validation

## Key Features

### Transaction Management
- All create, update, and delete operations use database transactions
- Ensures data consistency across related tables
- Automatic rollback on errors

### Relationship Management
- **Create**: Automatically creates PO items and RFID associations
- **Update**: Replaces all items and RFID associations (delete + recreate)
- **Delete**: Cascades to remove all related data

### Data Integrity
- Foreign key constraints ensure referential integrity
- Validation prevents invalid data entry
- Proper error handling for missing references

## API Endpoints

### Create Purchase Order
```
POST /api/v1/purchase-orders
Content-Type: application/json

{
  "po_number": "PO-2024-001",
  "vendor_id": 1,
  "total_amount": 1500.00,
  "requisition_id": 1,
  "status": "pending",
  "items": [
    {
      "item_id": 1,
      "quantity": 10,
      "unit": "PCS",
      "rfid_tags": [
        {
          "rfid_id": 1,
          "quantity": 5
        },
        {
          "rfid_id": 2,
          "quantity": 5
        }
      ]
    },
    {
      "item_id": 2,
      "quantity": 5,
      "unit": "BOX"
    }
  ]
}
```

### Get All Purchase Orders
```
GET /api/v1/purchase-orders?page=1&limit=10&searchTerm=PO-2024&status=pending&vendor_id=1
```

### Get Single Purchase Order (Basic)
```
GET /api/v1/purchase-orders/1
```

### Get Single Purchase Order (Complete with Items and RFID)
```
GET /api/v1/purchase-orders/1/complete
```

### Update Purchase Order
```
PATCH /api/v1/purchase-orders/1
Content-Type: application/json

{
  "status": "received",
  "total_amount": 1600.00,
  "items": [
    {
      "item_id": 1,
      "quantity": 12,
      "unit": "PCS",
      "rfid_tags": [
        {
          "rfid_id": 1,
          "quantity": 6
        },
        {
          "rfid_id": 2,
          "quantity": 6
        }
      ]
    }
  ]
}
```

### Delete Purchase Order
```
DELETE /api/v1/purchase-orders/1
```

## Data Flow

### Create Operation
1. Insert purchase order record
2. For each item in the request:
   - Insert PO item record
   - For each RFID tag in the item:
     - Insert RFID association record
3. Return complete purchase order with all relationships

### Update Operation
1. Update purchase order fields (if provided)
2. If items are provided:
   - Delete all existing PO items and RFID associations
   - Insert new items and RFID associations
3. Return updated purchase order with all relationships

### Delete Operation
1. Delete purchase order (cascade handles related data)
2. All PO items and RFID associations are automatically removed

## Validation Rules

### Purchase Order
- `po_number`: Required, max 60 characters, unique
- `vendor_id`: Required, must reference existing vendor
- `total_amount`: Optional, must be positive if provided
- `requisition_id`: Optional, must reference existing requisition
- `status`: Defaults to 'pending', must be 'pending' or 'received'

### PO Items
- `item_id`: Required, must reference existing item
- `quantity`: Required, must be positive
- `unit`: Required, max 16 characters

### RFID Associations
- `rfid_id`: Required, must reference existing RFID tag
- `quantity`: Defaults to 1, must be positive

## Error Handling
- Proper HTTP status codes for different scenarios
- Detailed error messages for validation failures
- Database constraint violation handling
- Transaction rollback on errors

## Integration
- Routes registered at `/api/v1/purchase-orders`
- Follows the same middleware pattern as other modules
- Uses existing database connection pool
- Integrates with vendors, items, and RFID modules

## Testing Examples

### Create a Purchase Order
```bash
curl -X POST http://localhost:3000/api/v1/purchase-orders \
  -H "Content-Type: application/json" \
  -d '{
    "po_number": "PO-TEST-001",
    "vendor_id": 1,
    "status": "pending",
    "items": [
      {
        "item_id": 1,
        "quantity": 5,
        "unit": "PCS",
        "rfid_tags": [
          {
            "rfid_id": 1,
            "quantity": 3
          },
          {
            "rfid_id": 2,
            "quantity": 2
          }
        ]
      }
    ]
  }'
```

### Get Complete Purchase Order
```bash
curl http://localhost:3000/api/v1/purchase-orders/1/complete
```

### Update Purchase Order
```bash
curl -X PATCH http://localhost:3000/api/v1/purchase-orders/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "received",
    "items": [
      {
        "item_id": 1,
        "quantity": 6,
        "unit": "PCS"
      }
    ]
  }'
```

## Notes
- The module automatically manages the relationships between purchase orders, items, and RFID tags
- When updating items, all existing items and RFID associations are replaced (not merged)
- The `getSinglePurchaseOrderComplete` endpoint provides the most comprehensive view with all related data
- All operations maintain referential integrity through foreign key constraints
- The module is ready for production use and follows best practices for data management
