# LED Wall Mapper V3 - Project Index

> **Complete Documentation Index and Navigation Guide**

## 📋 Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| **[README.md](../README.md)** | Project overview and quick start | All users |
| **[API.md](API.md)** | REST API reference | Developers |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design and technical details | Developers |
| **[ESP32_SETUP.md](../ESP32_SETUP.md)** | Hardware setup guide | Hardware users |
| **[CHANGELOG.md](../CHANGELOG.md)** | Version history and changes | All users |
| **[TEST_REPORT.md](../TEST_REPORT.md)** | Testing results and validation | QA/Developers |

## 🏗️ Project Structure

```
LEDWallV3/
├── 📄 README.md                    # Main project documentation
├── 📄 CHANGELOG.md                 # Version history
├── 📄 ESP32_SETUP.md              # Hardware setup guide
├── 📄 TEST_REPORT.md              # Testing validation
│
├── 📁 docs/                        # Additional documentation
│   ├── 📄 API.md                  # REST API reference
│   ├── 📄 ARCHITECTURE.md         # System architecture
│   └── 📄 PROJECT_INDEX.md        # This file
│
├── 📁 src/                         # React frontend source
│   ├── 📄 main.tsx                # React entry point
│   ├── 📄 App.tsx                 # Main app component
│   └── 📁 components/
│       ├── 📄 CameraPanel.tsx     # Main application logic
│       └── 📁 ui/
│           └── 📄 card.tsx        # UI components
│
├── 📁 backend/                     # Python backend
│   ├── 📄 main.py                 # FastAPI server
│   ├── 📄 requirements.txt        # Python dependencies
│   └── 📁 .venv/                  # Virtual environment
│
├── 📁 tests/                       # Test suites
│   ├── 📄 led-wall-mapper.spec.ts # E2E tests
│   └── 📄 api-test.spec.ts        # API tests
│
├── 📄 led_wall_controller.ino     # ESP32 firmware
├── 📄 start-backend.sh            # Backend launcher
├── 📄 package.json                # Frontend dependencies
├── 📄 playwright.config.ts        # Test configuration
├── 📄 vite.config.ts              # Build configuration
└── 📄 tsconfig.json               # TypeScript configuration
```

## 📚 Documentation Categories

### 🚀 Getting Started
- **[README.md](../README.md)** - Start here for project overview and quick setup
- **[ESP32_SETUP.md](../ESP32_SETUP.md)** - Hardware configuration and Arduino IDE setup

### 👨‍💻 Development
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, data flow, and algorithms
- **[API.md](API.md)** - Complete REST API documentation with examples
- **Source Code** - Well-commented TypeScript and Python code

### 🧪 Testing & Quality
- **[TEST_REPORT.md](../TEST_REPORT.md)** - Comprehensive test results and validation
- **[Playwright Tests](../tests/)** - E2E and API test suites

### 📈 Project Management
- **[CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes
- **[PROJECT_INDEX.md](PROJECT_INDEX.md)** - This navigation guide

## 🔧 Key Components Guide

### Frontend (React TypeScript)
**Main Component**: [`src/components/CameraPanel.tsx`](../src/components/CameraPanel.tsx)

**Key Features**:
- Camera feed management with WebRTC
- Interactive ROI selection with coordinate scaling
- Real-time mapping progress display
- Auto-connection and error handling

**State Management**:
- Connection state (`isConnected`)
- Camera state (`isVideoActive`, `isVideoReady`)
- ROI selection (`roi`, `isDrawing`)
- Mapping progress (`isMapping`, `mappingStatus`)

### Backend (Python FastAPI)
**Main Module**: [`backend/main.py`](../backend/main.py)

**Core Classes**:
- `SerialManager` - ESP32 communication
- `StartMapRequest` - API data models
- `_mapping_worker` - Computer vision processing

**Key Endpoints**:
- `POST /device/connect` - ESP32 connection
- `POST /start_mapping` - Begin LED mapping
- `GET /status` - Mapping progress

### Hardware (ESP32 Firmware)
**Main File**: [`led_wall_controller.ino`](../led_wall_controller.ino)

**Protocol Commands**:
- `CLEAR:` - Turn off all LEDs
- `PIXEL:idx,r,g,b` - Set specific LED
- `ALL:r,g,b` - Set all LEDs
- `BRIGHT:value` - Set brightness

## 🌐 Network Architecture

```
Browser (http://localhost:3001)
    ↓ HTTP/WebRTC
FastAPI Server (http://127.0.0.1:8000)
    ↓ Serial/USB
ESP32 + LED Strip
```

**Ports**:
- **3001**: React development server (avoid AirPlay conflict)
- **8000**: FastAPI backend server
- **Serial**: Auto-detected ESP32 port (`/dev/tty.usbserial-*`)

## 🔄 Data Flow Summary

1. **Initialization**:
   - Frontend auto-connects to backend
   - Backend auto-detects ESP32 serial port
   - Camera permissions requested

2. **ROI Selection**:
   - User clicks and drags on video feed
   - Coordinates scaled from display to video resolution
   - ROI rectangle overlaid on video

3. **LED Mapping**:
   - Frontend sends mapping request with ROI
   - Backend takes camera control
   - For each LED: light → capture → detect → save coordinates
   - Results saved to `mapping.json`

## 🛠️ Development Workflow

### Setup Development Environment
1. **Hardware**: Connect ESP32 with LED strip
2. **Firmware**: Upload `led_wall_controller.ino` to ESP32
3. **Backend**: Run `./start-backend.sh`
4. **Frontend**: Run `npm install && npm run dev -- --port 3001`

### Common Development Tasks
- **Add API Endpoint**: Modify `backend/main.py` and update `docs/API.md`
- **Update UI**: Edit `src/components/CameraPanel.tsx`
- **Change LED Protocol**: Update both ESP32 firmware and `SerialManager`
- **Add Tests**: Create new files in `tests/` directory

### Testing Strategy
- **E2E Tests**: Playwright tests for complete user workflows
- **API Tests**: Direct backend endpoint testing
- **Manual Testing**: Hardware-in-the-loop validation

## 🔗 External Resources

### Dependencies Documentation
- **[React](https://react.dev/)** - Frontend framework
- **[FastAPI](https://fastapi.tiangolo.com/)** - Backend framework
- **[OpenCV](https://opencv.org/)** - Computer vision library
- **[FastLED](https://github.com/FastLED/FastLED)** - Arduino LED library
- **[Playwright](https://playwright.dev/)** - E2E testing framework

### Hardware Resources
- **[ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)** - ESP32 official docs
- **[WS2812B Datasheet](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf)** - LED strip specifications
- **[Arduino IDE](https://www.arduino.cc/en/software)** - Development environment

## 🚨 Common Issues & Solutions

### Port Conflicts
- **Issue**: Port 3000 conflicts with AirPlay on macOS
- **Solution**: Use port 3001 for frontend (`npm run dev -- --port 3001`)

### Serial Connection Problems
- **Issue**: ESP32 not detected or connection fails
- **Solution**: Check USB cable, upload firmware, verify drivers

### Camera Access Issues
- **Issue**: Browser camera permission denied
- **Solution**: Enable camera permissions in browser settings

### ROI Selection Problems
- **Issue**: Click position doesn't match rectangle start
- **Solution**: Coordinate scaling handled automatically (fixed in v1.0.0)

## 📞 Support & Contributing

### Getting Help
1. Check this documentation first
2. Review [Common Issues](#-common-issues--solutions)
3. Check GitHub issues for similar problems
4. Create new issue with detailed information

### Contributing
1. Fork the repository
2. Create feature branch
3. Follow existing code style
4. Add tests for new features
5. Update documentation
6. Submit pull request

---

**Last Updated**: August 20, 2025  
**Version**: 1.0.0  
**Maintainer**: LED Wall Mapper Team