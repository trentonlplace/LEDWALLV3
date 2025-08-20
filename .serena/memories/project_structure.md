# Project Structure

## Root Directory
```
LEDWallV3/
├── backend/               # Python FastAPI backend
│   ├── main.py           # FastAPI application and LED control logic
│   ├── requirements.txt  # Python dependencies
│   └── mapping.json      # Generated LED coordinate mapping (output)
│
├── src/                   # React frontend source
│   ├── components/       # React components
│   ├── App.tsx          # Main React application
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles with Tailwind
│
├── node_modules/         # Frontend dependencies
├── .mcp.json            # MCP configuration
├── .eslintrc.cjs        # ESLint configuration
├── index.html           # HTML entry point
├── package.json         # Frontend dependencies and scripts
├── package-lock.json    # Locked dependencies
├── postcss.config.js    # PostCSS configuration for Tailwind
├── README.md            # Project documentation
├── serialscript.io      # Arduino/ESP32 firmware
├── start-backend.sh     # Backend startup script
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
├── tsconfig.node.json   # TypeScript config for node
└── vite.config.ts       # Vite build configuration
```

## Key Components

### Frontend (src/)
- **App.tsx**: Main component with webcam preview, ROI selection, and control interface
- **components/**: Reusable React components (to be added as needed)
- **main.tsx**: React DOM rendering and app initialization
- **index.css**: Tailwind CSS imports and global styles

### Backend (backend/)
- **main.py**: 
  - FastAPI app with CORS middleware
  - SerialManager class for Arduino communication
  - API endpoints for LED control and mapping
  - OpenCV integration for image processing
  - Mapping algorithm implementation

### Configuration Files
- **vite.config.ts**: Dev server on port 3000, React plugin
- **tsconfig.json**: Strict TypeScript with React JSX
- **tailwind.config.js**: Tailwind CSS customization
- **package.json**: NPM scripts (dev, build, lint, preview)

### Arduino Firmware
- **serialscript.io**: LED control firmware supporting commands:
  - CLEAR: Turn off all LEDs
  - PIXEL: Control individual LED
  - ALL: Set all LEDs to same color
  - BRIGHT: Global brightness control
  - BLINK: Blink specific LED

## Data Flow
1. User interacts with React frontend (localhost:3000)
2. Frontend sends API requests to FastAPI backend (localhost:8000)
3. Backend communicates with Arduino via serial (USB)
4. Arduino controls LED strip based on commands
5. Camera captures LED positions during mapping
6. Results saved to backend/mapping.json