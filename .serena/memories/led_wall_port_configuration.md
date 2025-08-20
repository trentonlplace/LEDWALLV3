# LED Wall Project Port Configuration

## Frontend Port Issue
- **IMPORTANT**: Port 3000 is used by AirPlay on macOS and causes conflicts
- **Solution**: Use port 3001 for the React frontend instead of default 3000
- **Configuration**: Start React dev server with `npm start -- --port 3001` or set PORT=3001 in .env

## Current Server Addresses
- **Frontend (React)**: http://localhost:3001 (NOT 3000 due to AirPlay conflict)
- **Backend (FastAPI)**: http://127.0.0.1:8000
- **API Base URL**: http://127.0.0.1:8000 (defined in CameraPanel.tsx)

## Troubleshooting
If port 3000 is accidentally used:
- AirPlay service conflicts will cause connection issues
- React app may fail to start or behave unexpectedly
- Always verify frontend is running on 3001

## Project Context
This is for the LED Wall Mapper V3 project located at /Users/trentonlplace/Desktop/LEDWallV3
- React TypeScript frontend with camera functionality
- Python FastAPI backend for ESP32 communication
- LED position mapping and control system