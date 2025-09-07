# Dashboard Module

This module provides real-time dashboard statistics for the warehouse management system.

## Features

- **Total Categories**: Count of active categories
- **Total Locations**: Count of all locations
- **Available RFID**: Count of available RFID tags
- **Total Vendors**: Count of active vendors
- **Total Items**: Count of all items
- **Available Requisitions**: Count of open requisitions

## API Endpoints

### GET /api/v1/dashboard/data
Returns complete dashboard data including metrics and charts.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard data retrieved successfully",
  "data": {
    "metrics": [
      {
        "name": "categories",
        "value": 5,
        "icon": "/dashboard/assets.svg",
        "label": "Total Categories"
      },
      // ... more metrics
    ],
    "topAssetCategories": {
      "labels": ["Electronics", "Furniture"],
      "data": [10, 5]
    },
    "assetPerformance": {
      "value": 25,
      "status": "Good",
      "statusIcon": "/dashboard/good.svg",
      "chart": {
        "labels": ["Apr", "May", "June", "July", "Aug", "Sept"],
        "data": [8, 12, 10, 15, 20, 18]
      }
    },
    "assetQuantity": {
      "value": 50,
      "status": "Good",
      "statusIcon": "/dashboard/good.svg",
      "chart": {
        "labels": ["Apr", "May", "June", "July", "Aug", "Sept"],
        "data": [10, 15, 12, 20, 15, 25]
      }
    },
    "serviceScheduleStatus": {
      "labels": ["Electronics", "Furniture"],
      "data": [1.0, 0.5]
    },
    "checkInOutActivity": {
      "growth": 1.3,
      "period": "Annually",
      "chart": {
        "labels": ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
        "data": [2, 3, 1, 4, 5, 3, 6, 7, 4, 3, 5, 8]
      }
    }
  }
}
```

### GET /api/v1/dashboard/stats
Returns only the basic statistics.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totalCategories": 5,
    "totalLocations": 10,
    "totalAvailableRfid": 50,
    "totalVendors": 8,
    "totalItems": 25,
    "totalAvailableRequisitions": 3
  }
}
```

## Database Queries

The module performs the following database queries:

1. **Categories**: `SELECT COUNT(*) FROM categories WHERE status = 'active'`
2. **Locations**: `SELECT COUNT(*) FROM locations`
3. **RFID Tags**: `SELECT COUNT(*) FROM rfid_tags WHERE status = 'available'`
4. **Vendors**: `SELECT COUNT(*) FROM vendors WHERE status = 'active'`
5. **Items**: `SELECT COUNT(*) FROM items`
6. **Requisitions**: `SELECT COUNT(*) FROM requisitions WHERE status = 'open'`

## Charts Data

- **Top Categories**: Shows the top 5 categories by item count
- **Monthly Activity**: Shows requisition activity over the last 12 months
- **Asset Performance**: Shows item count trends over 6 months
- **Asset Quantity**: Shows RFID availability trends over 6 months

## Error Handling

- If database queries fail, the service returns appropriate error messages
- Frontend has fallback data if the backend is unavailable
- All database operations are wrapped in try-catch blocks

## Testing

To test the dashboard API:

```bash
# Start the backend server
npm run dev

# Test the API (in another terminal)
node test-dashboard.js
```

## Frontend Integration

The frontend dashboard page (`Frontend/app/dashboard/page.tsx`) automatically fetches data from the backend API and displays it in a responsive grid layout. The page includes:

- 6 metric cards showing real-time statistics
- Interactive charts for data visualization
- Responsive design that works on all screen sizes
- Error handling with fallback data
