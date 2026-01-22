#!/bin/bash

echo "========================================"
echo "    CBAM Frontend Startup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "Node.js version: $(node --version)"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to the frontend directory (sibling folder)
FRONTEND_PATH="$SCRIPT_DIR/../cbam-frontend/my-react-app"
cd "$FRONTEND_PATH"

if [ $? -ne 0 ]; then
    echo "ERROR: Could not navigate to frontend directory: $FRONTEND_PATH"
    exit 1
fi

echo "Current directory: $(pwd)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    echo "This may take a few minutes on first run..."
    echo ""
    
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies"
        exit 1
    fi
    
    echo ""
    echo "Dependencies installed successfully!"
    echo ""
else
    echo "Dependencies already installed."
    echo ""
fi

# Start the development server
echo "Starting the development server..."
echo "The app will be available at http://localhost:5173"
echo "Press Ctrl+C to stop the server"
echo ""
echo "========================================"
echo ""

npm run dev