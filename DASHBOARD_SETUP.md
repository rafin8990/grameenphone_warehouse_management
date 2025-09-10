# Dynamic Dashboard Setup Guide

This guide will help you set up the dynamic dashboard that connects to your actual database instead of showing static/empty data.

## Current Issue

Your dashboard is currently showing zeros for all metrics because:
1. The backend server may not be running
2. The database tables are empty
3. The frontend falls back to mock data with zeros when the backend is unavailable

## Solution

### Step 1: Start the Backend Server

1. Open a terminal and navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```

   The server should start on `http://localhost:5000`

### Step 2: Populate the Database

1. In a new terminal, navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Run the database population script:
   ```bash
   node populate-db.js
   ```

   This will create sample data for:
   - 5 Categories (Electronics, Furniture, Office Supplies, Tools, Safety Equipment)
   - 5 Locations (Warehouse A1, A2, B1, C1, C2)
   - 5 Vendors (Tech Solutions, Office World, etc.)
   - 5 Items (Desktop Computer, Office Chair, etc.)
   - 10 RFID Tags (9 available, 1 assigned)
   - 5 Requisitions (3 open, 1 approved, 1 closed)
   - 5 Purchase Orders (3 pending, 1 approved, 1 completed)

### Step 3: Start the Frontend

1. Open a new terminal and navigate to the Frontend directory:
   ```bash
   cd Frontend
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

   The frontend should start on `http://localhost:3000`

### Step 4: Verify the Dashboard

1. Open your browser and go to `http://localhost:3000/dashboard`
2. You should now see real data instead of zeros:
   - **Total Categories**: 5
   - **Total Locations**: 5
   - **Available RFID**: 9
   - **Total Vendors**: 5
   - **Total Items**: 5
   - **Available Requisitions**: 3
   - **Total Purchase Orders**: 5
   - **Pending Purchase Orders**: 3

## What Was Fixed

### Backend Changes
1. **Fixed syntax error** in `dashboard.service.ts` (missing comma)
2. **Created database population script** (`populate-db.js`) to add sample data
3. **Backend API** now properly queries the database and returns real counts

### Frontend Changes
1. **Enhanced error handling** in the dashboard API route
2. **Added connection status banner** that shows when the backend is offline
3. **Improved user experience** with helpful error messages and setup instructions

## Database Schema

The dashboard now pulls data from these tables:
- `categories` - Item categories
- `locations` - Warehouse locations
- `vendors` - Supplier information
- `items` - Inventory items
- `rfid_tags` - RFID tracking tags
- `requisitions` - Material requisitions
- `purchase_orders` - Purchase orders

## Troubleshooting

### If you still see zeros:
1. Check that the backend server is running on port 5000
2. Verify the database connection settings in `Backend/src/config/index.ts`
3. Run the population script again: `node populate-db.js`
4. Check the browser console for any error messages

### If you see a "Backend Server Offline" banner:
1. Make sure the backend server is running
2. Check that it's running on the correct port (5000)
3. Verify there are no firewall issues blocking the connection

### If you see connection errors:
1. Check the backend server logs for any errors
2. Verify the database is accessible
3. Make sure all required environment variables are set

## Adding More Data

To add more realistic data to your database, you can:

1. **Modify the population script** (`Backend/populate-db.js`) to add more records
2. **Use the existing API endpoints** to add data through the frontend
3. **Import data from CSV files** using database tools
4. **Use the seed script** (`Backend/seed-test-data.js`) for more comprehensive test data

## Next Steps

Once you have the dynamic dashboard working:
1. Add more realistic data to match your actual warehouse
2. Customize the dashboard metrics to show relevant KPIs
3. Add real-time updates using WebSockets
4. Implement data visualization improvements
5. Add export functionality for reports

The dashboard is now fully dynamic and will show real data from your database!
