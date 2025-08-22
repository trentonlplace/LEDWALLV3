#!/bin/bash

# LED Mapper Backend Startup Script
echo "Starting LED Mapper Backend..."

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install/update requirements
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Set environment variables
export CAM_INDEX=0
export NUM_LEDS=300  # Total number of LEDs in the wall
export BAUD=115200
export MIN_BRIGHTNESS=0.1
export SETTLE_MS=150
export TOLERANCE=2

# Start the FastAPI server
echo "Starting FastAPI server on port 8000..."
echo "Backend will auto-detect Arduino on these ports:"
echo "  - /dev/tty.usbmodem*"
echo "  - /dev/tty.usbserial*" 
echo "  - /dev/tty.SLAB_USBtoUART*"
echo "  - /dev/tty.wchusbserial*"
echo ""
echo "If your Arduino is on a different port, set SERIAL_PORT environment variable"
echo ""

uvicorn main:app --reload --port 8000 --host 0.0.0.0