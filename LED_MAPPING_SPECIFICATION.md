# LED Mapping Specification v1.0

## Overview

This specification defines a standardized format for creating portable LED array mappings that can be shared between different applications and control systems. The system uses a normalized 160x90 pixel coordinate space (16:9 aspect ratio) as a universal reference canvas.

## Core Concepts

### Reference Canvas
- **Fixed Size**: 160 x 90 pixels (16:9 aspect ratio)
- **Coordinate System**: Origin (0,0) at top-left, x increases right, y increases down
- **Purpose**: Provides a consistent coordinate space regardless of actual display resolution

### Region of Interest (ROI)
- The actual area containing the LED array within the reference canvas
- Maintains original aspect ratio (no skewing/stretching)
- Centered and scaled to maximize canvas usage
t
## Part A: Generating a Map from ROI

### Step 1: Capture and Define ROI
1. Capture image/video of your LED array
2. Define a cropping rectangle around the LED array
3. Record the ROI dimensions and aspect ratio

### Step 2: Calculate ROI Placement on Canvas
```javascript
function calculateROIPlacement(roiWidth, roiHeight) {
  const canvasWidth = 160;
  const canvasHeight = 90;
  const canvasAspect = canvasWidth / canvasHeight; // 1.777...
  const roiAspect = roiWidth / roiHeight;
  
  let scaledWidth, scaledHeight, offsetX, offsetY;
  
  if (roiAspect > canvasAspect) {
    // ROI is wider - fit to width
    scaledWidth = canvasWidth;
    scaledHeight = canvasWidth / roiAspect;
    offsetX = 0;
    offsetY = (canvasHeight - scaledHeight) / 2;
  } else {
    // ROI is taller - fit to height
    scaledHeight = canvasHeight;
    scaledWidth = canvasHeight * roiAspect;
    offsetX = (canvasWidth - scaledWidth) / 2;
    offsetY = 0;
  }
  
  return {
    x: offsetX,
    y: offsetY,
    width: scaledWidth,
    height: scaledHeight
  };
}
```

### Step 3: Map LED Positions
For each detected LED in the ROI:
1. Get LED position relative to ROI (0-1 normalized)
2. Transform to canvas coordinates:

```javascript
function mapLEDToCanvas(ledX, ledY, roiPlacement) {
  // ledX, ledY are normalized (0-1) within the ROI
  const canvasX = roiPlacement.x + (ledX * roiPlacement.width);
  const canvasY = roiPlacement.y + (ledY * roiPlacement.height);
  
  return {
    x: Math.round(canvasX),
    y: Math.round(canvasY)
  };
}
```

### Step 4: Generate JSON Map
```json
{
  "version": "1.0",
  "metadata": {
    "name": "My LED Wall",
    "created": "2025-01-20T10:30:00Z",
    "totalLeds": 256,
    "arrayStructure": {
      "columns": 16,
      "rows": 16,
      "wiring": "zigzag"
    }
  },
  "canvas": {
    "width": 160,
    "height": 90
  },
  "roi": {
    "x": 35,
    "y": 0,
    "width": 90,
    "height": 90
  },
  "leds": [
    {
      "index": 0,
      "x": 38,
      "y": 3,
      "gridX": 0,
      "gridY": 0
    },
    {
      "index": 1,
      "x": 44,
      "y": 3,
      "gridX": 1,
      "gridY": 0
    }
  ]
}
```

## Part B: Using a Map File for Display

### Step 1: Load and Parse JSON
```javascript
const mapping = JSON.parse(mapFileContent);
```

### Step 2: Scale to Display Resolution
```javascript
function scaleToDisplay(mapping, displayWidth, displayHeight) {
  // Calculate scale factor maintaining 16:9 aspect
  const targetAspect = 16 / 9;
  const displayAspect = displayWidth / displayHeight;
  
  let scale, offsetX, offsetY;
  
  if (displayAspect > targetAspect) {
    // Display is wider - fit to height
    scale = displayHeight / 90;
    const scaledWidth = 160 * scale;
    offsetX = (displayWidth - scaledWidth) / 2;
    offsetY = 0;
  } else {
    // Display is taller - fit to width
    scale = displayWidth / 160;
    const scaledHeight = 90 * scale;
    offsetX = 0;
    offsetY = (displayHeight - scaledHeight) / 2;
  }
  
  return { scale, offsetX, offsetY };
}
```

### Step 3: Render LEDs
```javascript
function renderLEDs(mapping, displayWidth, displayHeight, ledStates) {
  const { scale, offsetX, offsetY } = scaleToDisplay(
    mapping, 
    displayWidth, 
    displayHeight
  );
  
  mapping.leds.forEach(led => {
    const displayX = offsetX + (led.x * scale);
    const displayY = offsetY + (led.y * scale);
    const color = ledStates[led.index];
    
    // Draw LED at (displayX, displayY) with color
    drawCircle(displayX, displayY, scale * 2, color);
  });
}
```

## JSON Schema

### Required Fields

- **version**: String - Specification version (currently "1.0")
- **canvas**: Object - Always `{ width: 160, height: 90 }`
- **roi**: Object - Bounding box of mapped area within canvas
  - `x`: Number - Left offset (0-160)
  - `y`: Number - Top offset (0-90)
  - `width`: Number - ROI width
  - `height`: Number - ROI height
- **leds**: Array - LED position data
  - `index`: Number - LED strip index (0-based)
  - `x`: Number - X position in canvas (0-160)
  - `y`: Number - Y position in canvas (0-90)

### Optional Fields

- **metadata**: Object - Additional information
  - `name`: String - User-friendly name
  - `created`: String - ISO 8601 timestamp
  - `totalLeds`: Number - Total LED count
  - `arrayStructure`: Object - Physical array details
- **leds** (additional):
  - `gridX`, `gridY`: Grid position if applicable
  - `strip`: Strip identifier for multi-strip setups
  - `group`: Grouping for effects

## Example Use Cases

### 1. Square LED Matrix (16x16)
- ROI aspect: 1:1
- Canvas placement: Centered with letterboxing
- ROI bounds: `{ x: 35, y: 0, width: 90, height: 90 }`

### 2. LED Strip (1x144)
- ROI aspect: 144:1 (extremely wide)
- Canvas placement: Thin horizontal line
- ROI bounds: `{ x: 0, y: 44, width: 160, height: 2 }`

### 3. Irregular LED Placement
- ROI aspect: Varies based on physical layout
- Canvas placement: Best fit within 160x90
- Each LED position individually mapped

## Implementation Notes

1. **Precision**: Round coordinates to integers for the 160x90 space
2. **Validation**: Ensure all LED positions fall within canvas bounds (0-160, 0-90)
3. **Scaling**: When displaying, maintain aspect ratio to prevent distortion
4. **Performance**: Pre-calculate display positions if rendering frequently
5. **Compatibility**: Include version field for future specification updates

## Benefits

- **Portable**: Maps work across different applications and platforms
- **Resolution-Independent**: Scales cleanly to any display size
- **Aspect-Preserving**: No distortion of mapped LED positions
- **Universal**: Standard coordinate system for all mappings
- **Efficient**: Small file size (160x90 coordinate space)