#!/bin/bash

echo "🚀 Starting Dynamic Dashboard Setup..."
echo ""

# Check if we're in the right directory
if [ ! -d "Backend" ] || [ ! -d "Frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   (the directory containing Backend and Frontend folders)"
    exit 1
fi

echo "📦 Step 1: Starting Backend Server..."
cd Backend
echo "   Installing dependencies..."
npm install --silent

echo "   Starting backend server in background..."
npm start &
BACKEND_PID=$!
echo "   Backend server started with PID: $BACKEND_PID"

# Wait a moment for the server to start
sleep 3

echo ""
echo "🗄️  Step 2: Populating Database..."
echo "   Running database population script..."
node populate-db.js

if [ $? -eq 0 ]; then
    echo "   ✅ Database populated successfully!"
else
    echo "   ❌ Error populating database"
    echo "   You may need to check your database connection settings"
fi

echo ""
echo "🌐 Step 3: Starting Frontend Server..."
cd ../Frontend
echo "   Installing dependencies..."
npm install --silent

echo "   Starting frontend development server..."
echo ""
echo "🎉 Setup complete! Your dynamic dashboard should now be available at:"
echo "   http://localhost:3000/dashboard"
echo ""
echo "📊 The dashboard will now show real data from your database instead of zeros!"
echo ""
echo "To stop the servers, press Ctrl+C or run:"
echo "   kill $BACKEND_PID"
echo ""

# Start the frontend server
npm run dev
