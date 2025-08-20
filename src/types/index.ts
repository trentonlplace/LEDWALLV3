/**
 * Type definitions for LED Wall Mapper V3
 */

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LEDCoordinate {
  x: number;
  y: number;
}

export interface MappingStatus {
  running: boolean;
  done: boolean;
  coords?: [number, number][];
  w?: number;
  h?: number;
  roi?: any;
  i?: number;
  total?: number;
  status?: 'idle' | 'mapping' | 'completed' | 'error';
  current_led?: number;
  total_leds?: number;
  coordinates?: LEDCoordinate[];
  message?: string;
}

export interface DeviceConnectionRequest {
  port: string | null;
  baud: number | null;
}

export interface DeviceConnectionResponse {
  ok: boolean;
  port?: string;
  baud?: number;
  message?: string;
}

export interface LEDPowerRequest {
  on: boolean;
}

export interface StartMappingRequest {
  roi: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  brightness: number;
  ledPower: boolean;
  num_leds: number;
}

export interface StartMappingResponse {
  ok: boolean;
  message?: string;
}

export interface CameraConstraints {
  video: {
    width: { ideal: number };
    height: { ideal: number };
  };
}

export interface VideoResolution {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Drawing system types
export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingLine {
  id: string;
  points: DrawingPoint[];
  color: string;
  width: number;
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface RGBColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface LEDPixelRequest {
  index: number;
  r: number;
  g: number;
  b: number;
}

export interface DrawingToolState {
  isDrawing: boolean;
  showLEDGrid: boolean;
  brushSize: number;
  currentColor: RGBColor;
  lines: DrawingLine[];
}