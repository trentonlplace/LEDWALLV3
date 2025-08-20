# Technology Stack

## Frontend
- **Framework**: React 18.2 with TypeScript
- **Build Tool**: Vite 5.2
- **Styling**: Tailwind CSS 3.4
- **Type Checking**: TypeScript 5.2
- **Module System**: ES Modules

## Backend
- **Framework**: FastAPI (Python)
- **Server**: Uvicorn with auto-reload
- **Computer Vision**: OpenCV-Python
- **Numerical Computing**: NumPy
- **Serial Communication**: PySerial
- **Data Validation**: Pydantic

## Development Tools
- **Package Manager**: npm (frontend), pip (backend)
- **Linting**: ESLint with TypeScript support
- **Code Formatting**: ESLint configurations
- **Hot Reload**: Vite (frontend), Uvicorn --reload (backend)

## Hardware Communication
- **Protocol**: Serial over USB at 115200 baud
- **Microcontroller**: ESP32/Arduino
- **LED Control**: Custom protocol with commands (CLEAR, PIXEL, ALL, BRIGHT, BLINK)

## Development Servers
- Frontend: http://localhost:3000 (Vite dev server)
- Backend: http://localhost:8000 (FastAPI/Uvicorn)