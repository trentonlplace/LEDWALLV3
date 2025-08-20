# ESP32 LED Wall Controller Setup

## 🚨 Issue Found
Your ESP32 is connected but **not programmed** with the LED control code. The backend is trying to communicate with an unprogrammed ESP32.

## ✅ Solution: Upload Arduino Code

### 1. **Open Arduino IDE**
```bash
open "/Applications/Arduino IDE.app"
```

### 2. **Install ESP32 Board Support** (if not already installed)
- Go to **File → Preferences**
- In "Additional Boards Manager URLs", add:
  ```
  https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
  ```
- Go to **Tools → Board → Boards Manager**
- Search for "ESP32" and install "ESP32 by Espressif Systems"

### 3. **Install FastLED Library**
- Go to **Tools → Manage Libraries** (or Sketch → Include Library → Manage Libraries)
- Search for "FastLED"
- Install "FastLED by Daniel Garcia"

### 4. **Configure Board Settings**
- Go to **Tools → Board** and select your ESP32 board (likely "ESP32 Dev Module")
- Set **Tools → Port** to `/dev/tty.usbserial-0001`
- Set **Tools → Upload Speed** to `115200`

### 5. **Upload the Code**
- Open the file: `/Users/trentonlplace/Desktop/LEDWallV3/led_wall_controller.ino`
- Click the **Upload** button (arrow icon)
- Wait for "Done uploading" message

### 6. **Verify Installation**
After uploading, your ESP32 should:
- Show a quick **Red → Green → Blue** LED test sequence
- Print startup messages in the Serial Monitor
- Respond to commands from the web interface

## 🔧 Hardware Connection
Make sure your LED strip is connected to:
- **Data Pin**: GPIO 4 on ESP32
- **Power**: 5V and Ground
- **LED Type**: WS2812B or WS2815

## 🧪 Test After Upload
1. Open **Tools → Serial Monitor** in Arduino IDE
2. Set baud rate to **115200**
3. You should see startup messages
4. Try typing: `CLEAR:` and press Enter
5. Try typing: `ALL:255,0,0` and press Enter (should turn all LEDs red)

## ✅ Expected Output in Serial Monitor
```
LED Wall Advanced Controller Starting...
Commands:
  CLEAR: - Clear all LEDs
  PIXEL:index,r,g,b - Set LED at index
  ALL:r,g,b - Set all LEDs
  BLINK:index - Blink LED
  BRIGHT:0-255 - Set brightness

Ready!
```

## 🧪 Quick Test After Upload
Run this test script to verify ESP32 is working:
```bash
python3 check_esp32.py
```

## 🚨 Current Issue Status

**Problem**: The "Connect Device" button does nothing because:
1. ✅ ESP32 is detected at `/dev/tty.usbserial-0001`
2. ✅ Backend is running and responding
3. ✅ Frontend shows proper error messages now
4. ❌ **ESP32 is not programmed with Arduino code yet**

**Solution**: Upload the `led_wall_controller.ino` file using Arduino IDE

## 🔧 Step-by-Step Upload Process

1. **Open Arduino IDE**: Should already be open, or run:
   ```bash
   open "/Applications/Arduino IDE.app"
   ```

2. **Open the sketch file**:
   - File → Open → Navigate to `led_wall_controller.ino`
   - Or it should already be open

3. **Configure the board**:
   - Tools → Board → ESP32 Arduino → **ESP32 Dev Module**
   - Tools → Port → **/dev/tty.usbserial-0001**
   - Tools → Upload Speed → **115200**

4. **Install FastLED library** (if not done):
   - Tools → Manage Libraries
   - Search "FastLED" → Install

5. **Upload the code**:
   - Click the **→** (Upload) button
   - Wait for "Done uploading"

6. **Verify in Serial Monitor**:
   - Tools → Serial Monitor
   - Set baud rate to 115200
   - You should see startup messages and "Ready!"

Once uploaded successfully, your web interface will be able to connect to the ESP32!