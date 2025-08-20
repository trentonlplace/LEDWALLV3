# API Endpoints Documentation

## Backend API (FastAPI - http://localhost:8000)

### GET /status
Get current system status
- **Response**: JSON with serial connection status, mapping progress, etc.
- **Example**: `curl http://localhost:8000/status`

### POST /connect
Connect to Arduino serial port
- **Request Body**: `{"port": "/dev/tty.usbmodem*"}` (optional, auto-detects if not provided)
- **Response**: `{"ok": true/false, "message": "..."}`

### POST /disconnect
Disconnect from Arduino
- **Response**: `{"ok": true/false}`

### POST /set_power
Control LED power state
- **Request Body**: `{"on": true/false, "brightness": 0-100}`
- **Response**: `{"ok": true/false}`

### POST /manual_set
Manually control specific LED
- **Request Body**: `{"index": 0-299, "r": 0-255, "g": 0-255, "b": 0-255}`
- **Response**: `{"ok": true/false}`

### POST /start_mapping
Start automated LED mapping process
- **Request Body**: `{"roi": {"x": 0, "y": 0, "w": 100, "h": 100}, "brightness": 10}`
- **Response**: `{"ok": true/false, "message": "..."}`

### GET /mapping_progress
Get current mapping progress
- **Response**: `{"running": true/false, "current": 0-299, "total": 300}`

### POST /stop_mapping
Stop mapping process
- **Response**: `{"ok": true/false}`

### GET /mapping_result
Get the completed mapping data
- **Response**: `{"coords": [[x, y], ...], "done": true/false}`

## FastAPI Auto-Documentation
- **Interactive API Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative Docs**: http://localhost:8000/redoc (ReDoc)

## Request/Response Models (Pydantic)
- **ROI**: Region of Interest with x, y, width, height
- **ConnectReq**: Optional port specification
- **PowerReq**: Power state and brightness
- **ManualSetReq**: LED index and RGB values
- **StartMapRequest**: ROI and brightness settings
- **MapResult**: Coordinate array and completion status

## CORS Configuration
- Allows all origins (*) for development
- Supports all methods and headers
- Credentials allowed for cookie/auth support