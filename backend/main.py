import json, os, time, threading
from threading import Thread
from typing import List, Tuple, Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import serial
from serial.tools import list_ports

# ------------------ Config ------------------
CAM_INDEX = int(os.getenv("CAM_INDEX", "0"))
NUM_LEDS = int(os.getenv("NUM_LEDS", "610"))  # Default 610 LEDs for the LED wall
MAX_CONSECUTIVE_FAILURES = int(os.getenv("MAX_CONSECUTIVE_FAILURES", "5"))  # Stop after 5 consecutive failures
SERIAL_PORT_ENV = os.getenv("SERIAL_PORT", None)  # e.g., /dev/tty.usbmodemXXXX
BAUD = int(os.getenv("BAUD", "115200"))
MIN_BRIGHTNESS = float(os.getenv("MIN_BRIGHTNESS", "0.1"))  # 10%
MAX_BRIGHTNESS = float(os.getenv("MAX_BRIGHTNESS", "1.0"))  # 100%
SETTLE_MS = int(os.getenv("SETTLE_MS", "50"))  # Time for LED to settle
TOLERANCE = int(os.getenv("TOLERANCE", "2"))  # intensity wiggle room

# --------------- Status (for live dots) -----
STATUS = {
    "running": False,
    "done": True,
    "coords": [],  # list[tuple[nx, ny]] in full-frame normalized units
    "w": 0,
    "h": 0,
    "roi": None,
    "current_led": -1,
    "total_leds": 0,  # Dynamic - discovered during mapping
    "consecutive_failures": 0,
    "adaptive_mode": True,
}
STATUS_LOCK = threading.Lock()

def status_reset():
    # Note: Caller must hold STATUS_LOCK
    STATUS.update({
        "running": True, 
        "done": False, 
        "coords": [], 
        "w": 0, 
        "h": 0, 
        "roi": None, 
        "current_led": -1,
        "total_leds": 0,
        "consecutive_failures": 0,
        "adaptive_mode": True
    })

def status_update(**kwargs):
    with STATUS_LOCK:
        STATUS.update(kwargs)

def status_append_coord(nx: float, ny: float):
    with STATUS_LOCK:
        STATUS["coords"].append((float(nx), float(ny)))

# --------------- Serial Manager -------------
class SerialManager:
    def __init__(self, default_port: Optional[str], baud: int):
        self.port = default_port
        self.baud = baud
        self.ser: Optional[serial.Serial] = None
        self.lock = threading.Lock()
        self.connected = False

    def autodetect(self) -> Optional[str]:
        """Auto-detect Arduino/ESP32 serial port on macOS"""
        prefixes = (
            "usbmodem",
            "usbserial",
            "SLAB_USBtoUART",
            "wchusbserial",
        )
        for p in list_ports.comports():
            dev = p.device
            if any(pref in dev for pref in prefixes):
                # Convert cu.* to tty.* for consistent usage
                if "/dev/cu." in dev:
                    dev = dev.replace("/dev/cu.", "/dev/tty.")
                print(f"Found serial device: {dev}")
                return dev
        return None

    def connect(self, port: Optional[str] = None, baud: Optional[int] = None) -> bool:
        """Connect to serial device"""
        port = port or self.port or self.autodetect()
        baud = baud or self.baud
        if not port:
            print("No serial port found")
            return False
        try:
            if self.ser and self.ser.is_open:
                self.ser.close()
            
            print(f"Attempting to connect to {port} at {baud} baud...")
            self.ser = serial.Serial(port, baud, timeout=1.0)
            self.port = port
            self.baud = baud
            
            # Brief wait for connection to stabilize
            time.sleep(0.5)
            
            # Clear any buffered data
            if hasattr(self.ser, 'reset_input_buffer'):
                self.ser.reset_input_buffer()
            if hasattr(self.ser, 'reset_output_buffer'):
                self.ser.reset_output_buffer()
                
            self.connected = True
            print(f"Connected to {port} at {baud} baud")
            return True
            
        except Exception as e:
            print(f"Failed to connect to {port}: {e}")
            self.ser = None
            self.connected = False
            return False

    def is_open(self) -> bool:
        return bool(self.ser and self.ser.is_open and self.connected)

    def send_command(self, command: str) -> bool:
        """Send a command to the Arduino using its protocol format"""
        if not self.is_open():
            if not self.connect():
                return False
        
        # Arduino expects commands like "PIXEL:0,255,0,0\n"
        if not command.endswith('\n'):
            command = command + '\n'
        
        with self.lock:
            try:
                self.ser.write(command.encode('utf-8'))
                # Read response
                response = self.ser.readline().decode('utf-8').strip()
                return True
            except Exception as e:
                print(f"Serial write error: {e}")
                self.connected = False
                return False

    def set_pixel(self, index: int, r: int, g: int, b: int) -> bool:
        """Set a single pixel using Arduino protocol"""
        cmd = f"PIXEL:{index},{r},{g},{b}"
        return self.send_command(cmd)
    
    def set_pixel_fast(self, index: int, r: int, g: int, b: int) -> bool:
        """Set a single pixel without waiting for response - for fast drawing"""
        if not self.is_open():
            if not self.connect():
                return False
        
        cmd = f"PIXEL:{index},{r},{g},{b}\n"
        
        with self.lock:
            try:
                self.ser.write(cmd.encode('utf-8'))
                self.ser.flush()  # Ensure data is sent immediately
                # Small delay to prevent Arduino buffer overflow
                time.sleep(0.005)  # 5ms delay
                return True
            except Exception as e:
                print(f"Serial write error: {e}")
                self.connected = False
                return False
    
    def set_pixels_batch(self, pixel_updates: list) -> bool:
        """Set multiple pixels in a batch for better performance"""
        if not self.is_open():
            if not self.connect():
                return False
        
        with self.lock:
            try:
                for index, r, g, b in pixel_updates:
                    cmd = f"PIXEL:{index},{r},{g},{b}\n"
                    self.ser.write(cmd.encode('utf-8'))
                    # Very small delay between commands to prevent buffer overflow
                    time.sleep(0.001)  # 1ms between commands
                
                self.ser.flush()  # Ensure all data is sent
                return True
            except Exception as e:
                print(f"Serial batch write error: {e}")
                self.connected = False
                return False
    
    def set_pixels_batch(self, pixels: list) -> bool:
        """Set multiple pixels using individual PIXEL commands"""
        if not self.is_open():
            if not self.connect():
                return False
        
        with self.lock:
            try:
                for pixel in pixels:
                    index, r, g, b = pixel
                    cmd = f"PIXEL:{index},{r},{g},{b}\n"
                    self.ser.write(cmd.encode('utf-8'))
                    self.ser.flush()
                    time.sleep(0.005)  # 5ms delay to prevent buffer overflow
                
                return True
            except Exception as e:
                print(f"Serial batch write error: {e}")
                self.connected = False
                return False
    
    def set_all(self, r: int, g: int, b: int) -> bool:
        """Set all pixels to the same color"""
        cmd = f"ALL:{r},{g},{b}"
        return self.send_command(cmd)
    
    def clear_all(self) -> bool:
        """Clear all LEDs"""
        cmd = "CLEAR:"
        return self.send_command(cmd)
    
    def set_brightness(self, brightness: int) -> bool:
        """Set global brightness (0-255)"""
        brightness = max(0, min(255, brightness))
        cmd = f"BRIGHT:{brightness}"
        return self.send_command(cmd)
    
    def blink_led(self, index: int) -> bool:
        """Blink a single LED"""
        cmd = f"BLINK:{index}"
        return self.send_command(cmd)

    def close(self):
        try:
            if self.ser:
                self.clear_all()  # Turn off all LEDs before closing
                self.ser.close()
        finally:
            self.ser = None
            self.connected = False

sm = SerialManager(default_port=SERIAL_PORT_ENV, baud=BAUD)

# --------------- FastAPI --------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------- Models ---------------------
class ROI(BaseModel):
    x: float  # normalized 0..1 (left)
    y: float  # normalized 0..1 (top)
    w: float  # normalized width
    h: float  # normalized height

class StartMapRequest(BaseModel):
    roi: ROI
    brightness: float  # 0..1
    ledPower: bool
    num_leds: Optional[int] = None
    resume_from_led: Optional[int] = None  # Resume mapping from this LED index

class MapResult(BaseModel):
    coords: List[Tuple[float, float]]  # normalized to full frame (0..1, 0..1)

class ConnectReq(BaseModel):
    port: Optional[str] = None
    baud: Optional[int] = None

class PowerReq(BaseModel):
    on: bool

class ManualSetReq(BaseModel):
    i: int
    b: float  # brightness 0..1

class LEDPixelReq(BaseModel):
    index: int
    r: int  # 0-255
    g: int  # 0-255 
    b: int  # 0-255

class LEDBatchReq(BaseModel):
    pixels: list  # List of [index, r, g, b] arrays

# --------------- Device helpers -------------
def _ensure_connected() -> None:
    if not sm.is_open():
        if not sm.connect():
            raise HTTPException(status_code=500, detail="ESP32/Arduino serial not connected")

def send_led_command(i: int, brightness: float):
    """Turn on a single LED with specified brightness"""
    _ensure_connected()
    # Convert brightness (0..1) to RGB values (0..255)
    rgb_val = int(brightness * 255)
    sm.set_pixel_fast(i, 0, rgb_val, 0)  # Green LED at specified brightness - using fast method for mapping

def all_off():
    """Turn off all LEDs"""
    if sm.is_open() or sm.connect():
        sm.clear_all()

# --------------- Device routes --------------
@app.post("/device/connect")
def device_connect(req: ConnectReq):
    """Connect to Arduino/ESP32 serial device"""
    try:
        print(f"Connection request received - Port: {req.port}, Baud: {req.baud}")
        ok = sm.connect(req.port, req.baud)
        if not ok:
            raise HTTPException(status_code=400, detail="No serial device found / connect failed")
        return {"ok": True, "port": sm.port, "baud": sm.baud}
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        print(f"Unexpected error in device_connect: {e}")
        raise HTTPException(status_code=500, detail=f"Connection error: {str(e)}")

@app.post("/device/power")
def device_power(req: PowerReq):
    """Toggle LED power on/off - Controls all LEDs"""
    if req.on:
        _ensure_connected()
        print(f"💡 TURNING ON ALL {NUM_LEDS} LEDS")
        # Set a moderate brightness to avoid overwhelming power draw
        sm.set_brightness(100)  # Moderate brightness for all LEDs
        # Turn all LEDs to white (equal RGB values)
        # Using lower values per channel to keep total power reasonable
        sm.set_all(100, 100, 100)  # White at moderate brightness
        print(f"✅ ALL {NUM_LEDS} LEDS ON: White at brightness 100")
    else:
        print(f"🔌 TURNING OFF ALL {NUM_LEDS} LEDS")
        all_off()
        print(f"✅ ALL {NUM_LEDS} LEDS OFF")
    return {"ok": True}

@app.post("/device/set")
def device_set(req: ManualSetReq):
    """Manually set a single LED"""
    send_led_command(req.i, req.b)
    return {"ok": True}

@app.post("/draw/led")
def draw_led(req: LEDPixelReq):
    """Set a single LED with RGB color for drawing - optimized for speed"""
    try:
        _ensure_connected()
        # Use simple pixel method
        success = sm.set_pixel_fast(req.index, req.r, req.g, req.b)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to set LED color")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LED control error: {str(e)}")

@app.post("/draw/led/batch")
def draw_led_batch(req: LEDBatchReq):
    """Set multiple LEDs in a batch - most efficient for drawing"""
    try:
        _ensure_connected()
        print(f"🚀 BATCH LED REQUEST: {len(req.pixels)} pixels")
        print(f"🔍 First 3 pixels: {req.pixels[:3] if req.pixels else 'none'}")
        
        # Debug: Log color values being sent 
        for pixel in req.pixels[:3]:  # Log first 3 pixels for debugging
            index, r, g, b = pixel
            print(f"🎨 DEBUG: LED {index} -> R:{r} G:{g} B:{b}")
        
        # Use simple batch method with PIXEL commands
        success = sm.set_pixels_batch(req.pixels)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to set LED colors")
        
        print(f"✅ BATCH LED SUCCESS: Updated {len(req.pixels)} LEDs")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ BATCH LED ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"LED batch control error: {str(e)}")

@app.get("/status")
def status():
    """Get current mapping status"""
    with STATUS_LOCK:
        return dict(STATUS)

# --------------- Mapping helpers ------------
def _centroid_of_mask(mask: np.ndarray) -> Tuple[float, float]:
    """Calculate centroid of a binary mask"""
    M = cv2.moments(mask, binaryImage=True)
    if M["m00"] == 0:
        ys, xs = np.where(mask > 0)
        if len(xs) == 0:
            return (0.0, 0.0)
        return (float(np.mean(xs)), float(np.mean(ys)))
    cx = float(M["m10"] / M["m00"])
    cy = float(M["m01"] / M["m00"])
    return (cx, cy)

def _find_single_spot(gray_roi: np.ndarray, tolerance: int) -> Tuple[bool, Tuple[float, float]]:
    """Find a single bright spot in the ROI"""
    _, maxVal, _, _ = cv2.minMaxLoc(gray_roi)
    thresh_val = max(0, maxVal - tolerance)
    _, mask = cv2.threshold(gray_roi, thresh_val, 255, cv2.THRESH_BINARY)
    mask = mask.astype(np.uint8)

    num_labels, _ = cv2.connectedComponents(mask)
    num_blobs = num_labels - 1  # background is 0
    if num_blobs <= 0:
        return False, (0.0, 0.0)
    if num_blobs == 1:
        cx, cy = _centroid_of_mask(mask)
        return True, (cx, cy)
    return False, (0.0, 0.0)

def _normalize_point(px: float, py: float, full_w: int, full_h: int) -> Tuple[float, float]:
    """Normalize pixel coordinates to 0..1 range"""
    return px / float(full_w), py / float(full_h)

# --------------- Mapping worker -------------
def _mapping_worker(req: StartMapRequest):
    """Worker thread for LED mapping process"""
    print("\n🧵 MAPPING WORKER THREAD STARTED")
    print(f"🔍 DEBUG: Worker received request = {req}")
    print("🔧 STEP 1: Checking device connection...")
    
    try:
        print("Checking device connection...")
        _ensure_connected()
        print("Device connected successfully")
    except HTTPException as e:
        print(f"Device connection failed: {e}")
        status_update(running=False, done=True)
        return

    print(f"Attempting to open camera with index {CAM_INDEX}...")
    
    # Wait longer for frontend to release camera
    print("Waiting 3 seconds for frontend to release camera...")
    time.sleep(3)
    
    # Try multiple times to open camera
    cap = None
    for attempt in range(5):
        try:
            print(f"Camera attempt {attempt + 1}/5")
            cap = cv2.VideoCapture(CAM_INDEX)
            if not cap.isOpened():
                if cap:
                    cap.release()
                print(f"Attempt {attempt + 1}: Failed to open camera - may be in use")
                time.sleep(1)  # Wait 1 second between attempts
                continue
            
            print("Camera opened successfully")
            
            # Test if we can actually read a frame
            ret, test_frame = cap.read()
            if not ret:
                print(f"Attempt {attempt + 1}: Camera opened but cannot read frames")
                cap.release()
                cap = None
                time.sleep(1)  # Wait 1 second between attempts
                continue
            
            print(f"Camera working, frame size: {test_frame.shape}")
            break  # Success, exit retry loop
            
        except Exception as e:
            print(f"Attempt {attempt + 1}: Camera error: {e}")
            if cap:
                cap.release()
                cap = None
            time.sleep(1)  # Wait 1 second between attempts
    
    if cap is None:
        print("Failed to access camera after 5 attempts")
        status_update(running=False, done=True, status="error", message="Failed to access camera after 5 attempts. Please ensure the camera is not in use by another application.")
        return

    coords: List[Tuple[float, float]] = []

    # Get initial frame for dimensions
    ok, frame = cap.read()
    if not ok:
        cap.release()
        status_update(running=False, done=True, status="error", message="Failed to read from camera. Please check camera connection.")
        return
    H, W = frame.shape[:2]
    status_update(w=W, h=H, roi=req.roi.dict())

    # ROI in pixel coords
    rx = int(req.roi.x * W)
    ry = int(req.roi.y * H)
    rw = max(1, int(req.roi.w * W))
    rh = max(1, int(req.roi.h * H))

    # Ensure all LEDs are off before starting
    all_off()
    time.sleep(0.5)  # Let the LEDs settle

    base_brightness = float(np.clip(req.brightness, MIN_BRIGHTNESS, MAX_BRIGHTNESS))
    
    # Convert to Arduino brightness scale (0-255)
    arduino_brightness = int(base_brightness * 255)
    sm.set_brightness(arduino_brightness)
    
    print(f"Starting adaptive LED mapping with brightness {base_brightness}")
    print(f"Will stop after {MAX_CONSECUTIVE_FAILURES} consecutive failures")
    
    consecutive_failures = 0
    led_index = req.resume_from_led if req.resume_from_led is not None else 0
    
    if req.resume_from_led is not None:
        print(f"🔄 RESUME MODE: Starting from LED {req.resume_from_led}")
    else:
        print(f"🆕 NEW MAPPING: Starting from LED 0")
    
    while consecutive_failures < MAX_CONSECUTIVE_FAILURES:
        print(f"\n💡 LED {led_index}: Starting mapping process")
        status_update(current_led=led_index, consecutive_failures=consecutive_failures)
        current_brightness = base_brightness
        attempts = 0
        spot_found = False

        # Use timer-based approach: LED on for minimal duration since detection is fast
        led_on_duration = 0.2  # 200ms total - detection happens in ~105ms
        
        print(f"🔆 LED {led_index}: Turning ON with brightness {current_brightness} for {led_on_duration*1000}ms")
        send_led_command(led_index, current_brightness)
        
        # Start timer AFTER the LED command is sent
        start_time = time.time()
        
        # Minimal settle time
        time.sleep(0.05)  # 50ms settle
        print(f"⏱️ LED {led_index}: Starting detection loop after {(time.time() - start_time)*1000:.0f}ms")
        
        while time.time() - start_time < led_on_duration and not spot_found:
            elapsed = time.time() - start_time
            print(f"🔍 LED {led_index}: Loop iteration at {elapsed*1000:.0f}ms")
            ok, frame = cap.read()
            if not ok:
                print(f"Failed to read frame for LED {led_index}")
                break
            
            # Extract ROI
            roi_img = frame[ry:ry+rh, rx:rx+rw]
            gray = cv2.cvtColor(roi_img, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (5, 5), 0)

            # Try to find single spot
            ok1, (cx_roi, cy_roi) = _find_single_spot(gray, TOLERANCE)
            if ok1:
                # Convert ROI coordinates to full frame coordinates
                cx_full = rx + cx_roi
                cy_full = ry + cy_roi
                nx, ny = _normalize_point(cx_full, cy_full, W, H)
                
                # Just record the position, even if it overlaps with previous LEDs
                coords.append((nx, ny))
                status_append_coord(nx, ny)
                spot_found = True
                consecutive_failures = 0  # Reset failure counter on success
                print(f"✅ LED {led_index}: Found at ({nx:.3f}, {ny:.3f}) after {elapsed*1000:.0f}ms")
                # Turn off LED immediately when found
                send_led_command(led_index, 0.0)
                break  # Exit detection loop immediately
            else:
                print(f"🔍 LED {led_index}: Attempt {attempts + 1} at {elapsed*1000:.0f}ms - not detected")
                # Try reducing brightness if we still have time and not too many attempts
                if elapsed < led_on_duration * 0.7 and attempts < 3:  # Only reduce brightness in first 70% of time, max 3 attempts
                    current_brightness = max(MIN_BRIGHTNESS, current_brightness * 0.8)
                    
                    # If brightness hits minimum, stop trying immediately
                    if current_brightness <= MIN_BRIGHTNESS:
                        print(f"LED {led_index}: Brightness at minimum ({MIN_BRIGHTNESS}), giving up")
                        break
                        
                    print(f"🔆 LED {led_index}: Reducing brightness to {current_brightness:.2f}")
                    send_led_command(led_index, current_brightness)
                    time.sleep(0.03)  # 30ms settle after brightness change
                
                attempts += 1

        # Turn off current LED (if not already turned off when found)
        total_time = time.time() - start_time
        if not spot_found:
            send_led_command(led_index, 0.0)
        # No delay between LEDs - immediate transition

        if not spot_found:
            print(f"❌ LED {led_index}: Not found after {attempts} attempts in {total_time*1000:.0f}ms")
            coords.append((0.0, 0.0))
            status_append_coord(0.0, 0.0)
            consecutive_failures += 1
            print(f"Consecutive failures: {consecutive_failures}/{MAX_CONSECUTIVE_FAILURES}")
        
        led_index += 1
        
        # Update status with current progress
        status_update(total_leds=led_index, consecutive_failures=consecutive_failures)
    
    print(f"\n🛑 Mapping stopped: {consecutive_failures} consecutive failures detected")
    print(f"📊 Total LEDs processed: {led_index}")
    print(f"✅ LEDs found: {len([c for c in coords if c != (0.0, 0.0)])}")
    print(f"❌ LEDs not found: {len([c for c in coords if c == (0.0, 0.0)])}")

    cap.release()
    all_off()

    # Save mapping results
    total_found = len([c for c in coords if c != (0.0, 0.0)])
    out = {
        "coords": coords, 
        "roi": req.roi.dict(), 
        "w": W, 
        "h": H, 
        "total_leds": led_index,
        "leds_found": total_found,
        "adaptive_mode": True,
        "consecutive_failures": consecutive_failures
    }
    with open("mapping.json", "w") as f:
        json.dump(out, f, indent=2)
    
    print(f"Adaptive mapping complete! Saved {total_found}/{led_index} LED positions to mapping.json")
    status_update(done=True, running=False, current_led=-1, total_leds=led_index)

# --------------- Routes ---------------------
@app.options("/start_mapping")
def start_mapping_options():
    """Handle CORS preflight for start_mapping"""
    return Response(status_code=200, headers={
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    })

@app.post("/start_mapping")
def start_mapping(req: StartMapRequest):
    """Start the LED mapping process"""
    print(f"\n🚀 START_MAPPING REQUEST RECEIVED")
    print(f"🔍 DEBUG: Request data = {req}")
    print(f"🔍 DEBUG: ROI = {req.roi}")
    print(f"🔍 DEBUG: Brightness = {req.brightness}")
    print(f"🔍 DEBUG: LED Power = {req.ledPower}")
    print(f"🔍 DEBUG: Num LEDs = {req.num_leds}")
    
    print("🔒 ACQUIRING STATUS LOCK...")
    with STATUS_LOCK:
        print("✅ STATUS LOCK ACQUIRED")
        print(f"🔍 DEBUG: Current status = {STATUS}")
        if STATUS.get("running"):
            print("❌ MAPPING FAILED: Already in progress")
            raise HTTPException(status_code=409, detail="Mapping already in progress")
        print("✅ STATUS RESET: Initializing new mapping")
        status_reset()
    print("🔓 STATUS LOCK RELEASED")
    
    print("🧵 STARTING BACKGROUND THREAD: Mapping worker")
    # Start mapping in background thread
    th = Thread(target=_mapping_worker, args=(req,), daemon=True)
    th.start()
    print("✅ MAPPING INITIATED: Returning success response")
    return {"ok": True, "message": "Mapping started"}

@app.post("/resume_mapping")
def resume_mapping_from_led(resume_from: int, brightness: float = 0.5):
    """Resume mapping from a specific LED index"""
    print(f"\n🔄 RESUME_MAPPING REQUEST: From LED {resume_from} with brightness {brightness}")
    
    with STATUS_LOCK:
        if STATUS.get("running"):
            raise HTTPException(status_code=409, detail="Mapping already in progress")
        
        # Get the last successful ROI from status if available
        last_roi = STATUS.get("roi")
        if not last_roi:
            raise HTTPException(status_code=400, detail="No previous mapping ROI found. Start a new mapping instead.")
        
        status_reset()
    
    # Create a request object for resuming
    resume_req = StartMapRequest(
        roi=ROI(
            x=last_roi["x"],
            y=last_roi["y"], 
            w=last_roi["w"],
            h=last_roi["h"]
        ),
        brightness=brightness,
        ledPower=True,
        resume_from_led=resume_from
    )
    
    # Start the mapping worker thread
    worker_thread = Thread(target=_mapping_worker, args=(resume_req,))
    worker_thread.daemon = True
    worker_thread.start()
    
    return {"ok": True, "message": f"Mapping resumed from LED {resume_from}"}

@app.get("/load_mapping")
def load_mapping():
    """Load existing mapping data from mapping.json file"""
    try:
        import os
        if not os.path.exists("mapping.json"):
            raise HTTPException(status_code=404, detail="No mapping file found. Please complete a mapping first.")
        
        with open("mapping.json", "r") as f:
            mapping_data = json.load(f)
        
        print(f"📁 LOAD_MAPPING: Loaded {len(mapping_data.get('coordinates', []))} LED coordinates from mapping.json")
        return mapping_data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid mapping file format")
    except Exception as e:
        print(f"❌ LOAD_MAPPING ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load mapping: {str(e)}")

@app.get("/")
def root():
    """Health check endpoint"""
    return {"status": "LED Mapper Backend Running", "serial_connected": sm.is_open()}

# Cleanup on shutdown
import atexit
def cleanup():
    all_off()
    sm.close()

atexit.register(cleanup)