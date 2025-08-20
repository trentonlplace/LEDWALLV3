# Suggested Commands for LED Mapper Development

## Frontend Development
```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview

# Type checking (included in build)
tsc
```

## Backend Development
```bash
# Start backend with auto-install (recommended)
./start-backend.sh

# Or manually:
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000 --host 0.0.0.0
```

## macOS System Commands
```bash
# List USB devices (find Arduino)
ls /dev/tty.usb*

# Monitor serial output
screen /dev/tty.usbmodem* 115200

# Exit screen session
Ctrl+A, then K

# Find processes using ports
lsof -i :3000  # Frontend
lsof -i :8000  # Backend

# Kill process by port
kill -9 $(lsof -t -i:3000)

# Check camera permissions
tccutil reset Camera

# Python virtual environment
source backend/.venv/bin/activate  # Activate
deactivate  # Deactivate
```

## Git Commands
```bash
# Common git operations
git status
git add .
git commit -m "message"
git push
git pull

# Branch operations
git checkout -b feature-branch
git merge main
```

## Environment Variables (Backend)
```bash
export CAM_INDEX=0              # Camera index
export NUM_LEDS=300            # Number of LEDs
export SERIAL_PORT=/dev/tty... # Manual port override
export BAUD=115200             # Serial baud rate
export MIN_BRIGHTNESS=0.1      # Minimum LED brightness
export SETTLE_MS=150           # LED settle time
export TOLERANCE=2             # Brightness tolerance
```

## Testing & Debugging
```bash
# Test backend API
curl http://localhost:8000/status

# Test serial connection
curl -X POST http://localhost:8000/connect \
  -H "Content-Type: application/json" \
  -d '{"port": "/dev/tty.usbmodem*"}'

# Watch backend logs
tail -f backend/*.log  # If logging is configured

# Check if services are running
ps aux | grep uvicorn  # Backend
ps aux | grep vite     # Frontend
```