# LED Wall Mapper V3

> **Production-Ready LED Position Mapping System**  
> Automatically maps LED positions using computer vision and ESP32 control for dynamic LED wall displays.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.13-green)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.2-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green)](https://fastapi.tiangolo.com/)

## ✨ Features

- **🔄 Auto-Connect**: Automatically detects and connects to ESP32 on startup
- **📹 Computer Vision**: Uses webcam for precise LED position detection  
- **🎯 ROI Selection**: Interactive region-of-interest selection with visual feedback
- **⚡ Real-time Control**: Individual LED control with brightness adjustment
- **📊 Progress Tracking**: Live mapping progress with LED counter
- **💾 Data Export**: Saves coordinate mapping to JSON for external use
- **🔧 Production Ready**: Clean UI, error handling, and optimized performance

## 🚀 Quick Start

### Prerequisites
- **Hardware**: ESP32/Arduino with WS2812B LED strip (GPIO pin 4)
- **Software**: Node.js 18+, Python 3.13+, Chrome/Safari browser
- **USB**: Cable to connect ESP32 to computer

### 1. Hardware Setup
```bash
# Upload Arduino firmware to ESP32
# See ESP32_SETUP.md for detailed instructions
```

### 2. Start Backend
```bash
# Auto-installs dependencies and starts FastAPI server
./start-backend.sh
# Server runs on http://127.0.0.1:8000
```

### 3. Start Frontend  
```bash
# Install dependencies and start development server
npm install
npm run dev -- --port 3001
# App runs on http://localhost:3001 (port 3000 conflicts with AirPlay)
```

### 4. Use the Application
1. **Auto-Connect**: ESP32 connection happens automatically
2. **Start Camera**: Click to enable webcam access
3. **Select ROI**: Click and drag on video to define LED detection area
4. **Start Mapping**: Begin automated LED position detection process

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  FastAPI Server │◄──►│   ESP32 + LEDs  │
│   Port 3001     │    │   Port 8000     │    │  Serial/USB     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
   ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
   │ Camera  │             │ OpenCV  │             │ FastLED │
   │ WebRTC  │             │ Vision  │             │ Library │
   └─────────┘             └─────────┘             └─────────┘
```

### Core Components

**Frontend (`src/components/CameraPanel.tsx`)**:
- Camera feed management with WebRTC
- Interactive ROI selection with coordinate scaling  
- Real-time mapping progress display
- Auto-connection and error handling

**Backend (`backend/main.py`)**:
- FastAPI server with CORS support
- OpenCV computer vision for LED detection
- Serial communication with ESP32
- Threading for non-blocking LED mapping

**Firmware (`led_wall_controller.ino`)**:
- Arduino/ESP32 code for LED control
- Serial command parsing and LED driver
- FastLED library integration

## 📡 API Reference

### Device Control
```http
POST /device/connect
Content-Type: application/json
{"port": null, "baud": null}
```

```http
POST /device/power  
Content-Type: application/json
{"on": true}
```

### LED Mapping
```http
POST /start_mapping
Content-Type: application/json
{
  "roi": {"x": 0.3, "y": 0.5, "w": 0.3, "h": 0.4},
  "brightness": 0.5,
  "ledPower": false, 
  "num_leds": 300
}
```

```http
GET /status
# Returns mapping progress and LED coordinates
```

### Serial Protocol
Commands sent to ESP32 via serial:
- `CLEAR:` - Turn off all LEDs
- `PIXEL:index,r,g,b` - Set specific LED (e.g., `PIXEL:0,255,255,255`)
- `ALL:r,g,b` - Set all LEDs to same color  
- `BRIGHT:0-255` - Set global brightness
- `BLINK:index` - Blink specific LED

## ⚙️ Configuration

### Environment Variables
```bash
# Backend configuration
export CAM_INDEX=0              # Camera index (0=built-in webcam)
export NUM_LEDS=300             # Total number of LEDs
export SERIAL_PORT=auto         # Auto-detect or specific port
export BAUD=115200              # Serial communication speed
export MIN_BRIGHTNESS=0.1       # Minimum LED brightness (10%)
export SETTLE_MS=150            # LED settle time in milliseconds
export TOLERANCE=2              # Brightness detection tolerance
```

### Port Configuration
- **Frontend**: `http://localhost:3001` (avoid port 3000 - AirPlay conflict)
- **Backend**: `http://127.0.0.1:8000`
- **Serial**: Auto-detects ESP32 on macOS (`/dev/tty.usbserial-*`)

## 🔧 Development

### Project Structure
```
LEDWallV3/
├── src/                     # React frontend
│   ├── components/
│   │   ├── CameraPanel.tsx  # Main application component
│   │   └── ui/card.tsx      # UI components
│   └── main.tsx             # React entry point
├── backend/
│   ├── main.py              # FastAPI server
│   ├── requirements.txt     # Python dependencies
│   └── .venv/               # Virtual environment
├── tests/                   # Playwright E2E tests
├── led_wall_controller.ino  # ESP32 firmware
├── ESP32_SETUP.md          # Hardware setup guide
└── start-backend.sh        # Backend launcher
```

### Testing
```bash
# Run E2E tests with Playwright
npm run test

# Run linting
npm run lint

# Build for production
npm run build
```

## 🛠️ Troubleshooting

### Connection Issues
| Problem | Solution |
|---------|----------|
| ESP32 not connecting | Check USB cable, upload firmware, try different port |
| Camera permission denied | Enable camera access in browser settings |
| Port 3000 conflicts | Use port 3001 (AirPlay uses 3000 on macOS) |
| Serial port not found | Check ESP32 drivers, verify device connection |

### Mapping Issues
| Problem | Solution |
|---------|----------|
| LEDs not detected | Increase brightness, adjust ROI, check LED connections |
| Multiple bright spots | Reduce brightness, improve lighting conditions |
| Slow detection | Reduce SETTLE_MS, optimize camera settings |
| Mapping hangs | Check camera not in use by other apps |

### Performance Optimization
- **Camera**: Use 1280x720 resolution for optimal performance
- **ROI**: Smaller regions process faster but may miss LEDs
- **Brightness**: Start with 50% and adjust based on detection success
- **Environment**: Consistent lighting improves detection accuracy

## 📄 Additional Documentation

- **[ESP32 Setup Guide](ESP32_SETUP.md)** - Hardware configuration and Arduino IDE setup
- **[Test Report](TEST_REPORT.md)** - Comprehensive testing results and validation
- **[API Documentation](docs/API.md)** - Complete API reference and examples

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)  
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FastLED Library** - Arduino LED control
- **OpenCV** - Computer vision processing
- **React** - Frontend framework
- **FastAPI** - Backend framework
- **Tailwind CSS** - UI styling