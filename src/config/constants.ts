/**
 * Application configuration constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://127.0.0.1:8000',
  TIMEOUT: 30000, // 30 seconds
} as const;

// Camera Configuration  
export const CAMERA_CONFIG = {
  DEFAULT_RESOLUTION: {
    width: 1280,
    height: 720,
  },
  AUTO_CONNECT_DELAY: 1000, // 1 second
} as const;

// LED Configuration
export const LED_CONFIG = {
  DEFAULT_COUNT: 64,
  DEFAULT_BRIGHTNESS: 50, // 50%
  MIN_BRIGHTNESS: 0,
  MAX_BRIGHTNESS: 100,
} as const;

// UI Configuration
export const UI_CONFIG = {
  POLLING_INTERVAL: 1000, // 1000ms for status updates - reduced from 250ms for better LED mapping performance
  ROI_STROKE_COLOR: '#0ea5e9', // sky-500
  ROI_STROKE_WIDTH: 2,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  CAMERA_NOT_SUPPORTED: 'Camera API not supported in this browser',
  CAMERA_PERMISSION_DENIED: 'Camera permission denied. Please allow camera access and try again.',
  CAMERA_NOT_FOUND: 'No camera found. Please connect a camera and try again.',
  CAMERA_NOT_SUPPORTED_BROWSER: 'Camera not supported in this browser.',
  CAMERA_IN_USE: 'Camera is being used by another application.',
  DEVICE_CONNECT_FIRST: 'Please connect to device first',
  ROI_SELECT_FIRST: 'Please select a region of interest (ROI) first',
  VIDEO_DIMENSIONS_UNAVAILABLE: 'Video dimensions not available. Please wait for camera to fully load.',
  INVALID_ROI_COORDINATES: 'Invalid ROI coordinates. Please select a valid region.',
  NETWORK_ERROR: 'Network error. Make sure the backend server is running.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  DEVICE_CONNECTED: 'Device connected successfully!',
  MAPPING_STARTED: 'LED mapping started successfully',
  MAPPING_COMPLETED: 'LED mapping completed successfully!',
} as const;