@echo off
echo ========================================
echo    CBAM Frontend Startup Script
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Navigate to the frontend directory
cd /d "%~dp0frontend\my-react-app"
echo Current directory: %CD%

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    echo This may take a few minutes on first run...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo Dependencies installed successfully!
    echo.
) else (
    echo Dependencies already installed.
    echo.
)

REM Start the development server
echo Starting the development server...
echo The app will be available at http://localhost:5173
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

npm run dev

pause