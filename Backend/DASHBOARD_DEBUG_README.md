# Dashboard Debug Guide

## Issue: Dashboard showing 0 values despite having data

### Quick Fix Steps

1. **Check if backend is running:**
   ```bash
   cd Backend
   npm run dev
   ```

2. **Test the API directly:**
   ```bash
   node test-simple.js
   ```

3. **If database is empty, seed test data:**
   ```bash
   node seed-test-data.js
   ```

4. **Check database connection:**
   ```bash
   node debug-db.js
   ```

### Debugging Steps

#### Step 1: Verify Backend is Running
- Backend should be running on `http://localhost:5000`
- Check console for any error messages
- Look for "✅ Connected to PostgreSQL database" message

#### Step 2: Test API Endpoint
Run the test script to see what the API returns:
```bash
node test-simple.js
```

Expected output should show actual numbers, not zeros.

#### Step 3: Check Database Data
Run the debug script to see what's in the database:
```bash
node debug-db.js
```

#### Step 4: Seed Test Data (if needed)
If database is empty, run:
```bash
node seed-test-data.js
```

This will add:
- 5 categories
- 5 locations  
- 5 vendors
- 5 items
- 10 RFID tags (8 available, 2 assigned)
- 5 requisitions (3 open, 1 approved, 1 closed)

### Common Issues and Solutions

#### Issue 1: Database Connection Error
**Symptoms:** Backend crashes or shows connection errors
**Solution:** 
- Check if PostgreSQL is running
- Verify database credentials in `.env` file
- Ensure database `warehouse_management` exists

#### Issue 2: Empty Database
**Symptoms:** All counts show 0
**Solution:**
- Run `node seed-test-data.js` to add test data
- Or manually add data through the application

#### Issue 3: Status Filter Issues
**Symptoms:** Some counts show 0 even with data
**Solution:**
- The dashboard service now checks both with and without status filters
- Categories and vendors are checked for both total count and active count

#### Issue 4: Frontend Not Connecting to Backend
**Symptoms:** Frontend shows fallback data (all zeros)
**Solution:**
- Ensure backend is running on port 5000
- Check browser console for CORS or connection errors
- Verify the API URL in `Frontend/app/api/dashboard/route.ts`

### API Endpoints

- `GET /api/v1/dashboard/data` - Complete dashboard data
- `GET /api/v1/dashboard/stats` - Basic statistics only

### Database Tables Used

- `categories` - For total categories count
- `locations` - For total locations count  
- `vendors` - For total vendors count
- `items` - For total items count
- `rfid_tags` - For available RFID count (status = 'available')
- `requisitions` - For open requisitions count (status = 'open')

### Expected Dashboard Values

After seeding test data, dashboard should show:
- Total Categories: 5
- Total Locations: 5
- Available RFID: 8
- Total Vendors: 5
- Total Items: 5
- Available Requisitions: 3

### Troubleshooting Commands

```bash
# Check if backend is running
curl http://localhost:5000/api/v1/health

# Test dashboard API
curl http://localhost:5000/api/v1/dashboard/data

# Check database connection
node debug-db.js

# Seed test data
node seed-test-data.js

# Test API with detailed output
node test-simple.js
```

### Logs to Check

1. **Backend Console:** Look for database connection and API call logs
2. **Frontend Console:** Check browser developer tools for API errors
3. **Database Logs:** Check PostgreSQL logs for query issues

### Next Steps After Fix

1. Verify dashboard shows real data
2. Test with different data sets
3. Remove debug console.log statements
4. Add proper error handling for production
