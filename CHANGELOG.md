# Changelog

All notable changes to the LED Wall Mapper V3 project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-20

### 🚀 Initial Release

#### Added
- **Computer Vision LED Mapping**: Automated LED position detection using webcam
- **ESP32 Integration**: Full Arduino/ESP32 support with FastLED library
- **React Frontend**: Modern TypeScript React application with Tailwind CSS
- **FastAPI Backend**: Python backend with OpenCV computer vision
- **Auto-Connection**: Automatic ESP32 device detection and connection
- **Interactive ROI Selection**: Click-and-drag region of interest selection
- **Real-time Progress**: Live mapping progress with LED counter
- **Serial Communication**: Robust serial protocol for LED control
- **Error Handling**: Comprehensive error handling and user feedback
- **Production Ready**: Clean UI, optimized performance, and deployment ready

#### Technical Features
- **WebRTC Camera Integration**: High-quality camera feed management
- **Coordinate Transformation**: Accurate scaling between display and video coordinates
- **Brightness Adaptation**: Dynamic brightness adjustment for optimal detection
- **Threading**: Non-blocking LED mapping with background processing
- **CORS Support**: Proper cross-origin request handling
- **Data Export**: JSON export of LED coordinate mappings
- **Environment Configuration**: Flexible configuration via environment variables

#### Hardware Support
- **ESP32/Arduino**: Compatible with ESP32 and Arduino boards
- **WS2812B LEDs**: Support for addressable RGB LED strips (up to 300 LEDs)
- **USB Serial**: Automatic serial port detection on macOS
- **Multiple Cameras**: Configurable camera index selection

#### Documentation
- **Comprehensive README**: Detailed setup and usage instructions
- **API Documentation**: Complete REST API reference
- **Architecture Guide**: System design and component documentation
- **ESP32 Setup Guide**: Hardware configuration instructions
- **Test Reports**: Comprehensive testing validation

### 🔧 Configuration

#### Default Settings
- **Frontend Port**: 3001 (avoiding AirPlay conflict on port 3000)
- **Backend Port**: 8000
- **LED Count**: 300 (configurable)
- **Camera Resolution**: 1280x720
- **Serial Baud Rate**: 115200
- **Detection Tolerance**: 2 pixels

#### Environment Variables
```bash
CAM_INDEX=0              # Camera index
NUM_LEDS=300             # Number of LEDs
SERIAL_PORT=auto         # Auto-detect serial port
BAUD=115200              # Serial baud rate
MIN_BRIGHTNESS=0.1       # Minimum LED brightness
SETTLE_MS=150            # LED settle time
TOLERANCE=2              # Detection tolerance
```

### 🧪 Testing

#### Test Coverage
- **E2E Tests**: Complete user workflow validation with Playwright
- **API Tests**: All backend endpoints tested
- **UI Tests**: Frontend component and interaction testing
- **Hardware Tests**: ESP32 communication and LED control validation

#### Performance Benchmarks
- **Mapping Speed**: ~300ms per LED (90 seconds for 300 LEDs)
- **Detection Accuracy**: ±2 pixel precision
- **Memory Usage**: <150MB total system memory
- **Response Time**: <200ms API response times

### 📦 Dependencies

#### Frontend
- **React**: 18.2.0 - UI framework
- **TypeScript**: 5.2.2 - Type safety
- **Tailwind CSS**: 3.4.3 - Styling
- **Vite**: 5.2.0 - Build tool
- **Playwright**: 1.54.2 - E2E testing

#### Backend
- **FastAPI**: Latest - Web framework
- **OpenCV**: 4.12.0.88 - Computer vision
- **NumPy**: 2.2.6 - Numerical computing
- **PySerial**: 3.5 - Serial communication
- **Pydantic**: 2.11.7 - Data validation

#### Hardware
- **FastLED**: Arduino library for LED control
- **ESP32/Arduino**: Microcontroller platforms

### 🛠️ Development Tools

#### Build System
- **Vite**: Fast frontend development and building
- **TypeScript**: Static type checking
- **ESLint**: Code linting and quality
- **Prettier**: Code formatting

#### Testing Framework
- **Playwright**: Cross-browser E2E testing
- **Jest**: Unit testing (future)
- **React Testing Library**: Component testing (future)

### 🚀 Deployment

#### Production Build
```bash
# Frontend production build
npm run build

# Backend deployment
./start-backend.sh
```

#### System Requirements
- **OS**: macOS (primary), Linux (compatible)
- **Node.js**: 18+ for frontend
- **Python**: 3.13+ for backend
- **Hardware**: ESP32/Arduino with WS2812B LEDs
- **Camera**: USB webcam or built-in camera

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Future Releases (Roadmap)

### [1.1.0] - Planned Features
- **Multiple Camera Support**: Select from multiple connected cameras
- **Advanced Detection**: Machine learning-based LED detection
- **Real-time Control**: WebSocket-based live LED control
- **Pattern Export**: Export to popular LED software formats
- **Mobile Support**: Progressive Web App (PWA) capabilities

### [1.2.0] - Planned Features  
- **3D Mapping**: Support for 3D LED wall configurations
- **Cloud Sync**: Cloud-based coordinate storage and sharing
- **Advanced UI**: Drag-and-drop interface improvements
- **Performance Optimization**: GPU acceleration for computer vision
- **Multi-language**: Internationalization support

### [2.0.0] - Major Version
- **Plugin System**: Extensible architecture for custom algorithms
- **Hardware Abstraction**: Support for multiple LED controller types
- **Professional Features**: Commercial licensing and enterprise features
- **Cross-platform**: Windows and Linux native support