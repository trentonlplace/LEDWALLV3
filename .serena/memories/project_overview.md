# LED Mapper Project Overview

## Purpose
LED Mapper is a simplified LED mapping system that uses a Mac's webcam to automatically map LED positions for an LED wall display. The system automates the process of determining the physical coordinates of each LED in a strip/wall by capturing their positions through the camera.

## Key Features
- Automated LED position detection using computer vision
- Real-time webcam preview with region of interest (ROI) selection
- Serial communication with ESP32/Arduino microcontrollers
- Web-based interface for control and monitoring
- Saves mapping coordinates to JSON for later use

## Target Platform
- macOS (Darwin) development environment
- Designed for Mac's built-in webcam
- ESP32/Arduino with LED strips connected via USB

## Main Components
1. **Frontend**: React-based web interface for user control
2. **Backend**: Python FastAPI server for hardware communication and image processing
3. **Firmware**: Arduino/ESP32 code for LED control (serialscript.io)

## Project Status
Active development project for LED wall mapping and control automation.