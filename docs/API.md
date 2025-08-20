# API Documentation

## Base URL
```
http://127.0.0.1:8000
```

## Authentication
No authentication required for local development.

## Endpoints

### Health Check
**GET** `/`

Returns server status and connection information.

**Response:**
```json
{
  "status": "LED Mapper Backend Running",
  "serial_connected": true
}
```

---

### Device Connection
**POST** `/device/connect`

Connect to ESP32/Arduino device via serial port.

**Request Body:**
```json
{
  "port": null,  // Auto-detect or specify port like "/dev/tty.usbserial-0001"
  "baud": null   // Auto-detect or specify like 115200
}
```

**Response (Success):**
```json
{
  "ok": true,
  "port": "/dev/tty.usbserial-0001",
  "baud": 115200
}
```

**Response (Error):**
```json
{
  "detail": "No serial device found / connect failed"
}
```

**Status Codes:**
- `200` - Connection successful
- `400` - Connection failed
- `500` - Server error

---

### LED Power Control
**POST** `/device/power`

Toggle LED power on/off.

**Request Body:**
```json
{
  "on": true  // true to turn on, false to turn off
}
```

**Response:**
```json
{
  "ok": true
}
```

**Behavior:**
- `on: true` - Sets brightness to 128 and turns all LEDs white
- `on: false` - Turns off all LEDs

---

### Manual LED Control
**POST** `/device/set`

Manually control a single LED.

**Request Body:**
```json
{
  "i": 0,      // LED index (0-299)
  "b": 0.5     // Brightness (0.0-1.0)
}
```

**Response:**
```json
{
  "ok": true
}
```

---

### Start LED Mapping
**POST** `/start_mapping`

Begin the automated LED position mapping process.

**Request Body:**
```json
{
  "roi": {
    "x": 0.3,      // Normalized X coordinate (0.0-1.0)
    "y": 0.5,      // Normalized Y coordinate (0.0-1.0) 
    "w": 0.3,      // Normalized width (0.0-1.0)
    "h": 0.4       // Normalized height (0.0-1.0)
  },
  "brightness": 0.5,   // LED brightness during mapping (0.0-1.0)
  "ledPower": false,   // Should be false for mapping
  "num_leds": 300      // Number of LEDs to map
}
```

**Response:**
```json
{
  "ok": true,
  "message": "Mapping started"
}
```

**Status Codes:**
- `200` - Mapping started successfully
- `409` - Mapping already in progress
- `422` - Invalid request data

**Notes:**
- ROI coordinates are normalized (0.0-1.0) relative to video dimensions
- Process runs in background thread
- Use `/status` endpoint to monitor progress

---

### Mapping Status
**GET** `/status`

Get current mapping status and progress.

**Response (Mapping in Progress):**
```json
{
  "running": true,
  "done": false,
  "coords": [
    [0.123, 0.456],  // [x, y] coordinates for mapped LEDs
    [0.789, 0.012]
  ],
  "w": 1280,           // Camera width
  "h": 720,            // Camera height
  "roi": {             // Region of interest used
    "x": 0.3,
    "y": 0.5, 
    "w": 0.3,
    "h": 0.4
  },
  "i": 42,             // Current LED being mapped
  "total": 300         // Total LEDs to map
}
```

**Response (Mapping Complete):**
```json
{
  "running": false,
  "done": true,
  "coords": [
    [0.123, 0.456],
    [0.789, 0.012],
    // ... 300 coordinate pairs
  ],
  "w": 1280,
  "h": 720,
  "i": -1,
  "total": 300
}
```

**Response (Idle):**
```json
{
  "running": false,
  "done": true,
  "coords": [],
  "w": 0,
  "h": 0,
  "roi": null,
  "i": -1,
  "total": 300
}
```

---

## CORS Configuration

The server is configured to accept requests from any origin:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Serial Protocol

The backend communicates with ESP32 using these commands:

### Commands Sent to ESP32

| Command | Format | Description | Example |
|---------|--------|-------------|---------|
| CLEAR | `CLEAR:` | Turn off all LEDs | `CLEAR:` |
| PIXEL | `PIXEL:index,r,g,b` | Set specific LED color | `PIXEL:0,255,255,255` |
| ALL | `ALL:r,g,b` | Set all LEDs to same color | `ALL:128,128,128` |
| BRIGHT | `BRIGHT:value` | Set global brightness (0-255) | `BRIGHT:128` |
| BLINK | `BLINK:index` | Blink specific LED | `BLINK:42` |

### Responses from ESP32

- `OK:brightness_set` - Brightness changed successfully
- `OK:cleared` - All LEDs cleared
- `OK:all_set` - All LEDs set to color
- `OK:pixel_set` - Single LED set
- `ERROR:message` - Command failed

---

## Error Handling

### Common Error Codes

- `400 Bad Request` - Invalid request parameters
- `409 Conflict` - Operation already in progress
- `422 Unprocessable Entity` - Invalid data format
- `500 Internal Server Error` - Server or hardware error

### Error Response Format

```json
{
  "detail": "Error description"
}
```

---

## Configuration Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CAM_INDEX` | `0` | Camera index for OpenCV |
| `NUM_LEDS` | `300` | Total number of LEDs |
| `SERIAL_PORT` | `auto` | Serial port or auto-detect |
| `BAUD` | `115200` | Serial baud rate |
| `MIN_BRIGHTNESS` | `0.1` | Minimum LED brightness |
| `MAX_BRIGHTNESS` | `1.0` | Maximum LED brightness |
| `SETTLE_MS` | `150` | LED settle time (ms) |
| `TOLERANCE` | `2` | Brightness detection tolerance |

---

## Data Files

### mapping.json

Generated after successful mapping completion:

```json
{
  "coords": [
    [0.123, 0.456],
    [0.789, 0.012],
    // ... coordinate pairs for each LED
  ],
  "roi": {
    "x": 0.3,
    "y": 0.5,
    "w": 0.3, 
    "h": 0.4
  },
  "w": 1280,        // Camera resolution width
  "h": 720,         // Camera resolution height
  "num_leds": 300   // Number of LEDs mapped
}
```

Coordinates are normalized (0.0-1.0) relative to full camera frame.