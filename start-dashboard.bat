@echo off
echo 🚀 Starting Dynamic Dashboard Setup...
echo.

REM Check if we're in the right directory
if not exist "Backend" (
    echo ❌ Error: Please run this script from the project root directory
    echo    (the directory containing Backend and Frontend folders)
    pause
    exit /b 1
)

if not exist "Frontend" (
    echo ❌ Error: Please run this script from the project root directory
    echo    (the directory containing Backend and Frontend folders)
    pause
    exit /b 1
)

echo 📦 Step 1: Starting Backend Server...
cd Backend
echo    Installing dependencies...
call npm install --silent

echo    Starting backend server in background...
start "Backend Server" cmd /k "npm start"

REM Wait a moment for the server to start
timeout /t 5 /nobreak > nul

echo.
echo 🗄️  Step 2: Populating Database...
echo    Running database population script...
node populate-db.js

if %errorlevel% equ 0 (
    echo    ✅ Database populated successfully!
) else (
    echo    ❌ Error populating database
    echo    You may need to check your database connection settings
)

echo.
echo 🌐 Step 3: Starting Frontend Server...
cd ..\Frontend
echo    Installing dependencies...
call npm install --silent

echo    Starting frontend development server...
echo.
echo 🎉 Setup complete! Your dynamic dashboard should now be available at:
echo    http://localhost:3000/dashboard
echo.
echo 📊 The dashboard will now show real data from your database instead of zeros!
echo.
echo To stop the servers, close the command windows or press Ctrl+C
echo.

REM Start the frontend server
call npm run dev
