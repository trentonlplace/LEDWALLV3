import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import type { ROI, LEDCoordinate, MappingStatus, RGBColor, LEDMappingFile } from '../types';
import { CAMERA_CONFIG, LED_CONFIG, UI_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../config/constants';
import {
  requestCameraAccess,
  validateVideoResolution,
  calculateScaling,
} from '../utils/camera';
import {
  connectDevice as apiConnectDevice,
  toggleLEDPower,
  getMappingStatus,
  setLEDPixelsBatch,
  loadMapping,
} from '../utils/api';
import DrawingCanvas from './DrawingCanvas';
import DrawingToolsPanel from './DrawingToolsPanel';

const CameraPanel: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [ledPower, setLedPower] = useState(false);
  const [brightness, setBrightness] = useState<number>(LED_CONFIG.DEFAULT_BRIGHTNESS);
  const [isMapping, setIsMapping] = useState(false);
  const [mappingStatus, setMappingStatus] = useState<MappingStatus | null>(null);
  const [mappingCompleted, setMappingCompleted] = useState(false);
  const [mappedCoordinates, setMappedCoordinates] = useState<LEDCoordinate[]>([]);
  const [originalVideoSize, setOriginalVideoSize] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });
  
  const [roi, setRoi] = useState<ROI | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Drawing system state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showLEDGrid, setShowLEDGrid] = useState(true);
  const [brushSize, setBrushSize] = useState(5);
  const [currentColor, setCurrentColor] = useState<RGBColor>({ r: 255, g: 0, b: 0 });

  // Start webcam
  const startWebcam = useCallback(async () => {
    // Prevent multiple concurrent requests
    if (streamRef.current || isInitializing) {
      return;
    }
    
    setIsInitializing(true);
    
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      const stream = await requestCameraAccess();
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            setIsVideoReady(true);
            resolve(true);
          };
        });
        
        setIsVideoActive(true);
      }
    } catch (error) {
      console.error('Error accessing webcam:', error);
      alert(error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing]);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    console.log('🔧 STOPPING WEBCAM: Comprehensive camera cleanup');
    
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('📹 Stopping track:', track.kind, track.label);
        track.stop();
      });
    }
    
    // Clear stream reference
    streamRef.current = null;
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Force reload to clear any cached streams
    }
    
    // Update state
    setIsVideoActive(false);
    setIsVideoReady(false);
    setIsInitializing(false);
    setRoi(null); // Clear ROI when stopping video
    
    console.log('✅ WEBCAM STOPPED: Camera fully released');
  }, []);

  // Connect to device
  const connectDevice = async () => {
    try {
      const data = await apiConnectDevice({ port: null, baud: null });
      if (data.ok) {
        setIsConnected(true);
        alert(`${SUCCESS_MESSAGES.DEVICE_CONNECTED}\nPort: ${data.port}\nBaud: ${data.baud}`);
      } else {
        alert(`Failed to connect: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.NETWORK_ERROR;
      
      // Add helpful hints for common errors
      let fullErrorMessage = errorMessage;
      if (errorMessage.includes('No serial device found')) {
        fullErrorMessage += '\n\nTroubleshooting:\n';
        fullErrorMessage += '• Make sure ESP32 is connected via USB\n';
        fullErrorMessage += '• Check if ESP32 is programmed with LED controller code\n';
        fullErrorMessage += '• Try uploading the Arduino sketch: led_wall_controller.ino';
      }
      
      alert(fullErrorMessage);
    }
  };

  // Toggle LED power
  const toggleLedPower = async () => {
    if (!isConnected) {
      alert(ERROR_MESSAGES.DEVICE_CONNECT_FIRST);
      return;
    }
    
    try {
      const data = await toggleLEDPower({ on: !ledPower });
      if (data.ok) {
        setLedPower(!ledPower);
      } else {
        alert(`Failed to toggle LED power: Unknown error`);
      }
    } catch (error) {
      console.error('LED power error:', error);
      alert('Failed to toggle LED power');
    }
  };

  // Start mapping
  const startMapping = async () => {
    console.log('🚀 START MAPPING: Button clicked');
    console.log('🔍 DEBUG: isConnected =', isConnected);
    console.log('🔍 DEBUG: roi =', roi);
    console.log('🔍 DEBUG: brightness =', brightness);
    console.log('🔍 DEBUG: ledPower =', ledPower);
    
    if (!isConnected) {
      console.log('❌ VALIDATION FAILED: Device not connected');
      alert(ERROR_MESSAGES.DEVICE_CONNECT_FIRST);
      return;
    }
    
    if (!roi) {
      console.log('❌ VALIDATION FAILED: No ROI selected');
      alert(ERROR_MESSAGES.ROI_SELECT_FIRST);
      return;
    }

    try {
      const video = videoRef.current;
      console.log('🔍 DEBUG: video element =', video);
      console.log('🔍 DEBUG: video dimensions =', video?.videoWidth, 'x', video?.videoHeight);
      
      if (!video || !validateVideoResolution(video)) {
        console.log('❌ VALIDATION FAILED: Video dimensions invalid');
        alert(ERROR_MESSAGES.VIDEO_DIMENSIONS_UNAVAILABLE);
        return;
      }
      
      // Validate ROI coordinates
      const normalizedRoi = {
        x: roi.x / video.videoWidth,
        y: roi.y / video.videoHeight,
        w: roi.width / video.videoWidth,
        h: roi.height / video.videoHeight
      };
      
      console.log('🔍 DEBUG: Raw ROI =', roi);
      console.log('🔍 DEBUG: Normalized ROI =', normalizedRoi);
      
      // Check for invalid normalized values
      if (!isFinite(normalizedRoi.x) || !isFinite(normalizedRoi.y) || 
          !isFinite(normalizedRoi.w) || !isFinite(normalizedRoi.h) ||
          normalizedRoi.w <= 0 || normalizedRoi.h <= 0 ||
          normalizedRoi.x < 0 || normalizedRoi.y < 0 ||
          normalizedRoi.x + normalizedRoi.w > 1 || normalizedRoi.y + normalizedRoi.h > 1) {
        console.log('❌ VALIDATION FAILED: Invalid ROI coordinates');
        console.log('🔍 DEBUG: ROI validation details:', {
          x_finite: isFinite(normalizedRoi.x),
          y_finite: isFinite(normalizedRoi.y),
          w_finite: isFinite(normalizedRoi.w),
          h_finite: isFinite(normalizedRoi.h),
          w_positive: normalizedRoi.w > 0,
          h_positive: normalizedRoi.h > 0,
          x_valid: normalizedRoi.x >= 0,
          y_valid: normalizedRoi.y >= 0,
          x_in_bounds: normalizedRoi.x + normalizedRoi.w <= 1,
          y_in_bounds: normalizedRoi.y + normalizedRoi.h <= 1
        });
        alert(ERROR_MESSAGES.INVALID_ROI_COORDINATES);
        return;
      }
      
      console.log('✅ VALIDATION PASSED: All checks successful');
      console.log('📹 STOPPING WEBCAM: Before API call');
      
      // Reset completion state when starting new mapping
      setMappingCompleted(false);
      
      // Stop webcam before backend takes control
      stopWebcam();
      
      // Wait longer for camera to be fully released
      console.log('⏳ WAITING: 2 seconds for camera to be fully released');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🌐 API CALL: Starting mapping request');
      const requestPayload = {
        roi: normalizedRoi,
        brightness: brightness / 100, // Convert percentage to 0-1
        ledPower: ledPower,
        // num_leds removed - using adaptive mapping
      };
      console.log('🔍 DEBUG: Request payload =', requestPayload);
      
      // Temporary direct fetch to debug
      console.log('🌐 DIRECT FETCH: Making request to http://127.0.0.1:8000/start_mapping');
      const response = await fetch('http://127.0.0.1:8000/start_mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      
      console.log('📡 RESPONSE STATUS:', response.status, response.statusText);
      const data = await response.json();
      console.log('📡 API RESPONSE:', data);
      
      if (data.ok) {
        console.log('✅ MAPPING STARTED: Setting state and polling status');
        setIsMapping(true);
        pollMappingStatus();
      } else {
        console.log('❌ MAPPING FAILED: API returned not ok');
        alert(`Failed to start mapping: ${data.message || 'Unknown error'}`);
        startWebcam(); // Restart webcam if mapping failed
      }
    } catch (error) {
      console.error('❌ MAPPING ERROR: Exception caught', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to start mapping: ${errorMessage}`);
      startWebcam(); // Restart webcam if mapping failed
    }
  };

  // Resume mapping from specific LED index
  const resumeMapping = async () => {
    console.log('🔄 RESUME MAPPING: Button clicked');
    
    if (!isConnected) {
      alert(ERROR_MESSAGES.DEVICE_CONNECT_FIRST);
      return;
    }

    if (!mappingStatus?.current_led || mappingStatus.current_led <= 0) {
      alert('No previous mapping session found to resume from.');
      return;
    }

    const resumeFromLed = mappingStatus.current_led;
    console.log(`🔄 RESUME: Continuing from LED ${resumeFromLed}`);

    try {
      // Stop webcam before backend takes control
      console.log('📹 STOPPING WEBCAM: Before resume API call');
      stopWebcam();
      
      // Wait for camera to be fully released
      console.log('⏳ WAITING: 2 seconds for camera to be fully released');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(`http://localhost:8000/resume_mapping?resume_from=${resumeFromLed}&brightness=${brightness}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Resume mapping failed: ${errorData}`);
      }

      console.log('✅ RESUME SUCCESS: Mapping resumed successfully');
      setIsMapping(true);

      // Start polling for mapping status
      const interval = setInterval(async () => {
        await pollMappingStatus();
      }, 1000);

      // Store interval for cleanup
      (window as any).mappingInterval = interval;
      
    } catch (error) {
      console.error('❌ RESUME ERROR: Exception caught', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to resume mapping: ${errorMessage}`);
      startWebcam(); // Restart webcam if resume failed
    }
  };

  // Poll mapping status
  const pollMappingStatus = async () => {
    try {
      const status = await getMappingStatus();
      setMappingStatus(status);

      if (status.done && !status.running) {
        console.log('🎉 MAPPING COMPLETED! Drawing results...');
        setIsMapping(false);
        setMappingCompleted(true);
        // Convert backend coordinate format to frontend format
        const coordinates = (status.coords || []).map(([x, y]: [number, number]) => ({ x, y }));
        console.log('🔍 DEBUG: Coordinates to draw:', coordinates.length, 'LEDs');
        console.log('🔍 DEBUG: Sample coordinates:', coordinates.slice(0, 5));
        drawMappingResults(coordinates);
      } else if (status.status === 'error') {
        console.log('❌ MAPPING ERROR: Status indicates error:', status.message);
        setIsMapping(false);
        setMappingCompleted(false);
        alert(`Mapping failed: ${status.message || 'Unknown error'}`);
        startWebcam(); // Restart webcam on error
      } else if (status.running) {
        // Continue polling while mapping is in progress
        setTimeout(pollMappingStatus, UI_CONFIG.POLLING_INTERVAL);
      }
    } catch (error) {
      console.error('Status polling error:', error);
      setIsMapping(false);
      setMappingCompleted(false);
      startWebcam(); // Restart webcam on error
    }
  };

  // Draw mapping results on canvas
  const drawMappingResults = (coordinates: LEDCoordinate[]) => {
    console.log('🎨 DRAW MAPPING RESULTS: Starting to draw...');
    
    // Store coordinates and video size for drawing mode
    setMappedCoordinates(coordinates);
    if (videoRef.current) {
      setOriginalVideoSize({
        width: videoRef.current.videoWidth || 1280,
        height: videoRef.current.videoHeight || 720
      });
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ DRAW ERROR: Canvas ref not found');
      return;
    }
    console.log('✅ CANVAS FOUND: Canvas dimensions =', canvas.width, 'x', canvas.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ DRAW ERROR: Canvas context not found');
      return;
    }
    console.log('✅ CONTEXT FOUND: Ready to draw');

    // Set canvas size to match the mapping canvas dimensions
    canvas.width = 1280;
    canvas.height = 720;
    console.log('✅ CANVAS RESIZED: Set to 1280x720');

    // Clear canvas and set black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log('✅ BACKGROUND DRAWN: Black background filled');

    // Draw ROI box
    if (roi) {
      ctx.strokeStyle = UI_CONFIG.ROI_STROKE_COLOR;
      ctx.lineWidth = UI_CONFIG.ROI_STROKE_WIDTH;
      ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
      console.log('✅ ROI DRAWN: ROI box displayed');
    }

    // Draw LED coordinates as white dots
    ctx.fillStyle = 'white';
    let drawnCount = 0;
    coordinates.forEach((coord, index) => {
      // Convert normalized coordinates (0-1) to canvas pixels
      const x = coord.x * canvas.width;
      const y = coord.y * canvas.height;
      
      // Skip invalid coordinates (0,0 means LED not found)
      if (coord.x === 0 && coord.y === 0) {
        console.log(`⚪ LED ${index}: Skipped (not found)`);
        return;
      }
      
      console.log(`💡 LED ${index}: Drawing at (${x.toFixed(1)}, ${y.toFixed(1)})`);
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add LED number labels
      ctx.fillStyle = 'yellow';
      ctx.font = '12px Arial';
      ctx.fillText(index.toString(), x + 6, y - 6);
      ctx.fillStyle = 'white';
      
      drawnCount++;
    });
    
    console.log(`🎉 DRAWING COMPLETE: Drew ${drawnCount} LEDs out of ${coordinates.length} total`);
  };

  // Handle LED updates from drawing - optimized batch updates
  const handleLEDsUpdate = useCallback(async (ledUpdates: { index: number; color: RGBColor }[]) => {
    console.log('📞 handleLEDsUpdate called with', ledUpdates.length, 'updates, isConnected =', isConnected);
    if (!isConnected) {
      console.log('❌ Device not connected, skipping LED updates');
      return;
    }

    try {
      console.log('🚀 Batch LED update: Sending', ledUpdates.length, 'LED updates');
      console.log('🔍 Sample LED updates:', ledUpdates.slice(0, 3));
      
      // Convert to batch format: Array<[index, r, g, b]>
      const pixels = ledUpdates.map(update => [
        update.index,
        update.color.r,
        update.color.g,
        update.color.b
      ] as [number, number, number, number]);
      
      console.log('📦 Converted to batch format, sending to setLEDPixelsBatch');
      console.log('🔍 Sample batch pixels:', pixels.slice(0, 3));
      
      // Send all LED updates in a single batch call
      const result = await setLEDPixelsBatch(pixels);
      
      if (result.ok) {
        console.log('✅ Batch LED update successful');
      } else {
        console.error('❌ Batch LED update failed', result);
      }
    } catch (error) {
      console.error('❌ Failed to update LEDs:', error);
    }
  }, [isConnected]);

  // Drawing mode handlers
  const handleDrawingModeToggle = useCallback(() => {
    console.log('🎨 DRAWING MODE TOGGLE: Current mode:', isDrawingMode, '→ New mode:', !isDrawingMode);
    console.log('🎨 DRAWING MODE TOGGLE: mappedCoordinates.length =', mappedCoordinates.length);
    const newDrawingMode = !isDrawingMode;
    setIsDrawingMode(newDrawingMode);
    
    if (newDrawingMode) {
      console.log('💡 Entering drawing mode - LEDs will be controlled by strokes only');
      // Don't automatically clear LEDs - let user control them through drawing
    } else {
      console.log('💡 Exiting drawing mode');
      // Optionally clear LEDs when exiting drawing mode
      const clearLEDUpdates = mappedCoordinates.map((_, index) => ({ 
        index, 
        color: { r: 0, g: 0, b: 0 } 
      }));
      console.log('💡 Clearing LEDs on exit from drawing mode');
      handleLEDsUpdate(clearLEDUpdates);
    }
  }, [isDrawingMode, mappedCoordinates, handleLEDsUpdate]);

  const handleClearAll = useCallback(() => {
    // Turn off all LEDs
    handleLEDsUpdate(mappedCoordinates.map((_, index) => ({ 
      index, 
      color: { r: 0, g: 0, b: 0 } 
    })));
  }, [mappedCoordinates, handleLEDsUpdate]);

  // Load existing mapping data from backend
  const handleLoadMapping = useCallback(async () => {
    try {
      console.log('📁 Loading mapping data from backend...');
      const mappingData = await loadMapping();
      console.log('📁 Loaded mapping data:', mappingData);
      
      // Convert coordinates to the expected format
      const coordinates = mappingData.coords.map(([x, y]) => ({ x, y }));
      console.log('📁 Converted coordinates:', coordinates.length, 'LEDs');
      
      // Update state with loaded data
      setMappedCoordinates(coordinates);
      setRoi({
        x: mappingData.roi.x,
        y: mappingData.roi.y,
        width: mappingData.roi.w,
        height: mappingData.roi.h
      });
      
      // Set the original video dimensions from loaded mapping
      setOriginalVideoSize({
        width: mappingData.w,
        height: mappingData.h
      });
      
      setMappingCompleted(true);
      
      console.log('✅ Mapping data loaded successfully');
      alert(`Mapping loaded successfully! ${coordinates.length} LEDs mapped.`);
    } catch (error) {
      console.error('❌ Failed to load mapping:', error);
      alert('Failed to load mapping. Please complete a mapping first.');
    }
  }, []);

  // Export mapping to JSON file
  const exportMapping = useCallback(() => {
    if (mappedCoordinates.length === 0) {
      alert('No mapping data to export. Please complete a mapping first.');
      return;
    }

    if (!roi) {
      alert('No ROI data available. Cannot export mapping.');
      return;
    }

    // Calculate ROI placement on normalized 160x90 canvas
    const canvasWidth = 160;
    const canvasHeight = 90;
    const canvasAspect = canvasWidth / canvasHeight; // 1.777...
    const roiAspect = roi.width / roi.height;
    
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

    const roiPlacement = {
      x: offsetX,
      y: offsetY,
      width: scaledWidth,
      height: scaledHeight
    };

    // Convert LED coordinates to normalized canvas positions
    const normalizedLEDs = mappedCoordinates.map((coord, index) => {
      // Skip invalid coordinates (0,0 means LED not found)
      if (coord.x === 0 && coord.y === 0) {
        return null;
      }

      // Convert from normalized video coordinates (0-1) to canvas coordinates
      const canvasX = roiPlacement.x + (coord.x * roiPlacement.width);
      const canvasY = roiPlacement.y + (coord.y * roiPlacement.height);

      return {
        index,
        x: Math.round(canvasX),
        y: Math.round(canvasY)
      };
    }).filter(led => led !== null); // Remove invalid LEDs

    // Create mapping JSON in the standardized format
    const mapping = {
      version: "1.0",
      metadata: {
        name: `LED Mapping ${new Date().toLocaleDateString()}`,
        created: new Date().toISOString(),
        totalLeds: mappedCoordinates.length,
        validLeds: normalizedLEDs.length,
        arrayStructure: {
          wiring: "unknown" // Could be enhanced later
        }
      },
      canvas: {
        width: canvasWidth,
        height: canvasHeight
      },
      roi: {
        x: Math.round(roiPlacement.x),
        y: Math.round(roiPlacement.y),
        width: Math.round(roiPlacement.width),
        height: Math.round(roiPlacement.height)
      },
      originalROI: {
        x: roi.x,
        y: roi.y,
        width: roi.width,
        height: roi.height,
        videoWidth: originalVideoSize.width,
        videoHeight: originalVideoSize.height
      },
      leds: normalizedLEDs
    };

    // Create and download the JSON file
    const jsonString = JSON.stringify(mapping, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `led-mapping-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('🎉 MAPPING EXPORTED:', {
      totalLEDs: mapping.metadata.totalLeds,
      validLEDs: mapping.metadata.validLeds,
      roiPlacement,
      canvasSize: `${canvasWidth}x${canvasHeight}`,
      filename: link.download
    });

    alert(`Mapping exported successfully!\nValid LEDs: ${mapping.metadata.validLeds}/${mapping.metadata.totalLeds}\nFile: ${link.download}`);
  }, [mappedCoordinates, roi, originalVideoSize]);

  // Import mapping from JSON file
  const importMapping = useCallback((mappingData: LEDMappingFile) => {
    console.log('🔄 IMPORT MAPPING: Starting import process', mappingData);
    
    try {
      // Convert normalized LED coordinates back to coordinate system used by the application
      const convertedCoordinates: LEDCoordinate[] = [];
      
      // Get ROI placement from the loaded mapping
      const roiPlacement = mappingData.roi;
      
      // Convert each LED coordinate
      mappingData.leds.forEach((led) => {
        // Convert from canvas coordinates back to normalized coordinates (0-1)
        const normalizedX = (led.x - roiPlacement.x) / roiPlacement.width;
        const normalizedY = (led.y - roiPlacement.y) / roiPlacement.height;
        
        // Ensure coordinates are within valid range (0-1)
        const clampedX = Math.max(0, Math.min(1, normalizedX));
        const clampedY = Math.max(0, Math.min(1, normalizedY));
        
        // Expand the array to the correct index (fill gaps with {x: 0, y: 0})
        while (convertedCoordinates.length <= led.index) {
          convertedCoordinates.push({ x: 0, y: 0 });
        }
        
        convertedCoordinates[led.index] = {
          x: clampedX,
          y: clampedY
        };
      });
      
      // Set the mapped coordinates
      setMappedCoordinates(convertedCoordinates);
      
      // Restore the original ROI from the mapping file
      const restoredROI: ROI = {
        x: mappingData.originalROI.x,
        y: mappingData.originalROI.y,
        width: mappingData.originalROI.width,
        height: mappingData.originalROI.height
      };
      setRoi(restoredROI);
      
      // Set the original video size
      setOriginalVideoSize({
        width: mappingData.originalROI.videoWidth,
        height: mappingData.originalROI.videoHeight
      });
      
      // Set mapping as completed
      setMappingCompleted(true);
      setIsMapping(false);
      
      // Draw the mapping results on the canvas
      drawMappingResults(convertedCoordinates);
      
      console.log('✅ IMPORT COMPLETE:', {
        totalLEDs: mappingData.metadata.totalLeds,
        validLEDs: mappingData.metadata.validLeds,
        convertedLEDs: convertedCoordinates.length,
        roi: restoredROI,
        videoSize: `${mappingData.originalROI.videoWidth}x${mappingData.originalROI.videoHeight}`
      });
      
    } catch (error) {
      console.error('❌ IMPORT ERROR:', error);
      alert('Error importing mapping file. Please check the file format and try again.');
    }
  }, [drawMappingResults]);

  // Mouse handlers for ROI selection
  const handleMouseDown = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (isMapping) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    const rect = video.getBoundingClientRect();
    
    // Get mouse position relative to video element (display coordinates)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    console.log('🖱️ MOUSE DOWN: Display coords:', { mouseX, mouseY });
    console.log('📐 Video rect:', { 
      left: rect.left, 
      top: rect.top, 
      width: rect.width, 
      height: rect.height 
    });
    
    // Store display coordinates, we'll convert to video coordinates when needed
    setStartPoint({ x: mouseX, y: mouseY });
    setIsDrawing(true);
    setRoi(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isDrawing || !startPoint || isMapping || !isVideoReady) return;

    const video = videoRef.current;
    if (!video) return;
    
    // Skip if video dimensions are not available
    if (!video.videoWidth || !video.videoHeight) {
      console.warn('Video dimensions not available yet for ROI');
      return;
    }
    
    const rect = video.getBoundingClientRect();
    
    // Get current mouse position relative to video element (display coordinates)
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Debug logging
    if (Math.random() < 0.1) { // Log only 10% of the time to reduce console spam
      console.log('🖱️ MOUSE MOVE:', {
        client: { x: e.clientX, y: e.clientY },
        relative: { x: mouseX, y: mouseY },
        videoSize: { width: video.videoWidth, height: video.videoHeight },
        displaySize: { width: rect.width, height: rect.height }
      });
    }
    
    // Calculate display coordinates for ROI rectangle
    const displayX = Math.min(startPoint.x, mouseX);
    const displayY = Math.min(startPoint.y, mouseY);
    const displayWidth = Math.abs(mouseX - startPoint.x);
    const displayHeight = Math.abs(mouseY - startPoint.y);
    
    // Only proceed if we have a reasonable size
    if (displayWidth < 5 || displayHeight < 5) return;
    
    // Convert to video coordinates for storage
    const { scaleX, scaleY } = calculateScaling(video, rect);
    
    // Validate scale factors
    if (!scaleX || !scaleY || !isFinite(scaleX) || !isFinite(scaleY)) {
      console.warn('Invalid scale factors:', { scaleX, scaleY, videoWidth: video.videoWidth, rectWidth: rect.width });
      return;
    }
    
    const newRoi: ROI = {
      x: displayX * scaleX,
      y: displayY * scaleY,
      width: displayWidth * scaleX,
      height: displayHeight * scaleY
    };
    
    // Validate final ROI coordinates
    if (newRoi.width > 0 && newRoi.height > 0 && 
        newRoi.x >= 0 && newRoi.y >= 0 &&
        isFinite(newRoi.x) && isFinite(newRoi.y) && 
        isFinite(newRoi.width) && isFinite(newRoi.height)) {
      setRoi(newRoi);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Draw ROI overlay on video
  useEffect(() => {
    if (!roi || !videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get the actual display dimensions
    const rect = video.getBoundingClientRect();
    
    // Set canvas size to match video display size exactly
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate scaling factors from video coordinates to display coordinates
    const { scaleX, scaleY } = calculateScaling(video, rect);
    const inverseScaleX = 1 / scaleX;
    const inverseScaleY = 1 / scaleY;
    
    // Scale ROI coordinates back to display coordinates
    const displayX = roi.x * inverseScaleX;
    const displayY = roi.y * inverseScaleY;
    const displayWidth = roi.width * inverseScaleX;
    const displayHeight = roi.height * inverseScaleY;
    
    console.log('🎨 DRAWING ROI:', {
      videoCoords: { x: roi.x, y: roi.y, w: roi.width, h: roi.height },
      displayCoords: { x: displayX, y: displayY, w: displayWidth, h: displayHeight },
      scales: { scaleX, scaleY, inverseScaleX, inverseScaleY },
      canvasSize: { width: canvas.width, height: canvas.height }
    });
    
    // Draw ROI rectangle
    ctx.strokeStyle = UI_CONFIG.ROI_STROKE_COLOR;
    ctx.lineWidth = UI_CONFIG.ROI_STROKE_WIDTH;
    ctx.strokeRect(displayX, displayY, displayWidth, displayHeight);
  }, [roi]);

  // Auto-connect to device and check mapping status on mount
  useEffect(() => {
    let mounted = true;
    
    // Auto-connect to device when component mounts
    const autoConnect = async () => {
      if (!mounted) return;
      
      try {
        const data = await apiConnectDevice({ port: null, baud: null });
        
        if (data.ok) {
          setIsConnected(true);
        }
      } catch (error) {
        // Auto-connect failed, manual connection required
      }
    };

    // Check if there's already a completed mapping on mount
    const checkInitialMappingStatus = async () => {
      if (!mounted) return;
      
      try {
        console.log('🔍 MOUNT CHECK: Checking for existing completed mapping...');
        const status = await getMappingStatus();
        console.log('🔍 MOUNT STATUS:', status);
        
        if (status.done && !status.running && status.coords && status.coords.length > 0) {
          console.log('🎉 MOUNT DETECTION: Found completed mapping! Transitioning to drawing mode...');
          
          // Set the mapping completion state
          setMappingCompleted(true);
          setIsMapping(false);
          
          // Convert coordinates and set ROI from stored data
          const coordinates = status.coords.map(([x, y]: [number, number]) => ({ x, y }));
          setMappedCoordinates(coordinates);
          
          // Restore ROI from backend if available
          if (status.roi) {
            const restoredRoi: ROI = {
              x: status.roi.x * (status.w || 1280),
              y: status.roi.y * (status.h || 720),
              width: status.roi.w * (status.w || 1280),
              height: status.roi.h * (status.h || 720)
            };
            setRoi(restoredRoi);
            console.log('🔍 MOUNT ROI: Restored ROI:', restoredRoi);
          } else {
            // Set a default ROI if none is available
            const defaultRoi: ROI = {
              x: 0,
              y: 0,
              width: status.w || 1280,
              height: status.h || 720
            };
            setRoi(defaultRoi);
            console.log('🔍 MOUNT ROI: Using default ROI:', defaultRoi);
          }
          
          // Set original video dimensions from backend
          if (status.w && status.h) {
            setOriginalVideoSize({ width: status.w, height: status.h });
            console.log('🔍 MOUNT VIDEO: Set video dimensions:', status.w, 'x', status.h);
          }
          
          // Draw the mapping results
          drawMappingResults(coordinates);
          
          console.log('✅ MOUNT COMPLETE: Successfully transitioned to drawing mode with', coordinates.length, 'LEDs');
        } else {
          console.log('ℹ️ MOUNT STATUS: No completed mapping found, showing normal interface');
        }
      } catch (error) {
        console.error('⚠️ MOUNT ERROR: Failed to check initial mapping status:', error);
        // Don't show error to user, just continue with normal flow
      }
    };
    
    // Start auto-connect and status check after a short delay to let backend initialize
    const timer = setTimeout(async () => {
      await autoConnect();
      await checkInitialMappingStatus();
    }, CAMERA_CONFIG.AUTO_CONNECT_DELAY);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
      stopWebcam();
    };
  }, []); // Empty dependency array to run only once

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Video Preview */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Camera Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto rounded-lg bg-gray-900"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ 
                  cursor: isDrawing ? 'crosshair' : 'pointer',
                  display: isVideoActive && !isMapping ? 'block' : 'none'
                }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ 
                  display: isVideoActive && !isMapping ? 'block' : 'none',
                  width: '100%',
                  height: '100%'
                }}
              />
              
              {(isMapping || mappingCompleted) ? (
                <div className="w-full bg-black rounded-lg relative">
                  {isMapping ? (
                    <div className="w-full aspect-video bg-black rounded-lg flex items-center justify-center relative">
                      <canvas
                        ref={canvasRef}
                        className="w-full h-full"
                        width={1280}
                        height={720}
                      />
                      <div className="absolute top-4 left-4 text-white">
                        <div>
                          <p>Mapping in progress...</p>
                          {mappingStatus?.current_led !== undefined && (
                            <>
                              <p>Testing LED {mappingStatus.current_led}</p>
                              {mappingStatus?.adaptive_mode && (
                                <p className="text-sm text-gray-400">
                                  Adaptive mode: {mappingStatus.consecutive_failures || 0}/5 consecutive failures
                                </p>
                              )}
                              {mappingStatus?.total_leds && (
                                <p className="text-sm text-gray-300">
                                  Found: {mappingStatus.total_leds} LEDs
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : mappingCompleted ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                        <div className="text-white">
                          <p className="text-green-400 font-medium">Mapping Complete!</p>
                          <p className="text-sm text-gray-300">
                            Found {mappedCoordinates.filter(c => c.x !== 0 || c.y !== 0).length} LEDs
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setMappingCompleted(false);
                            setIsDrawingMode(false);
                            startWebcam();
                          }}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        >
                          Return to Camera
                        </button>
                      </div>
                      
                      <div className="overflow-auto max-h-[600px]">
                        <DrawingCanvas
                          ledCoordinates={mappedCoordinates}
                          roi={roi || { x: 0, y: 0, width: originalVideoSize.width, height: originalVideoSize.height }}
                          originalVideoWidth={originalVideoSize.width}
                          originalVideoHeight={originalVideoSize.height}
                          isDrawingMode={isDrawingMode}
                          showLEDGrid={showLEDGrid}
                          brushSize={brushSize}
                          currentColor={currentColor}
                          onDrawingComplete={() => {}}
                          onLEDsUpdate={handleLEDsUpdate}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              
              {!isVideoActive && !isMapping && !mappingCompleted && (
                <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-white">
                  <div className="text-center">
                    {isInitializing ? (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                        <p className="mb-4">Requesting camera access...</p>
                        <p className="text-sm text-gray-400">Please allow camera permissions when prompted</p>
                      </>
                    ) : (
                      <>
                        <p className="mb-4">Camera not active</p>
                        <button 
                          onClick={startWebcam}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Start Camera
                        </button>
                        <p className="text-sm text-gray-400 mt-2">Click to request camera access</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {roi && !isMapping && (
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  ROI: {Math.round(roi.width)} × {Math.round(roi.height)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Panel */}
      <div className="space-y-6">
        {/* Device Connection */}
        <Card>
          <CardHeader>
            <CardTitle>Device Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm font-medium">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <button
                onClick={connectDevice}
                disabled={isConnected}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isConnected ? 'Connected' : 'Connect Device'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* LED Controls */}
        <Card>
          <CardHeader>
            <CardTitle>LED Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* LED Power Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">LED Power</label>
                <button
                  onClick={toggleLedPower}
                  disabled={!isConnected}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    ledPower 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  } disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed`}
                >
                  {ledPower ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Brightness Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Brightness</label>
                  <span className="text-sm text-gray-500">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={LED_CONFIG.MIN_BRIGHTNESS}
                  max={LED_CONFIG.MAX_BRIGHTNESS}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={!isConnected}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mapping Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {roi 
                  ? `ROI selected: ${Math.round(roi.width)} × ${Math.round(roi.height)}` 
                  : 'Click and drag on the video to select ROI'
                }
              </p>
              
              <button
                onClick={startMapping}
                disabled={!isConnected || !roi || !isVideoReady || isMapping}
                className="w-full px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isMapping ? 'Mapping...' : 'Start Mapping'}
              </button>

              {/* Load Existing Mapping Button */}
              <button
                onClick={handleLoadMapping}
                disabled={!isConnected || isMapping}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Load Existing Mapping
              </button>

              {/* Resume Mapping Button - Show if there's a previous session */}
              {mappingStatus?.current_led && mappingStatus.current_led > 0 && !isMapping && (
                <button
                  onClick={resumeMapping}
                  disabled={!isConnected || isMapping}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Resume from LED {mappingStatus.current_led}
                </button>
              )}

              {mappingStatus && (
                <div className="text-sm">
                  <p><strong>Status:</strong> {mappingStatus.status}</p>
                  {mappingStatus.current_led !== undefined && (
                    <>
                      <p><strong>Current LED:</strong> {mappingStatus.current_led}</p>
                      {mappingStatus.adaptive_mode && (
                        <p><strong>Failures:</strong> {mappingStatus.consecutive_failures || 0}/5</p>
                      )}
                      {mappingStatus.total_leds && (
                        <p><strong>LEDs Found:</strong> {mappingStatus.total_leds}</p>
                      )}
                    </>
                  )}
                  {mappingStatus.coordinates && (
                    <p><strong>LEDs Found:</strong> {mappingStatus.coordinates.length}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mapping Info Panel - Show LED count when mapping is loaded */}
        {mappingCompleted && mappedCoordinates.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>LED Mapping Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total LEDs:</span>
                  <span className="font-medium">{mappedCoordinates.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Valid LEDs:</span>
                  <span className="font-medium text-green-600">
                    {mappedCoordinates.filter(coord => coord.x !== 0 || coord.y !== 0).length}
                  </span>
                </div>
                {roi && (
                  <div className="flex justify-between">
                    <span>ROI:</span>
                    <span className="font-medium">
                      {Math.round(roi.width)}×{Math.round(roi.height)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-medium text-green-600">Ready for Drawing</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Drawing Tools Panel - Always show, but conditionally enable export */}
        <DrawingToolsPanel
          isDrawingMode={isDrawingMode}
          showLEDGrid={showLEDGrid}
          brushSize={brushSize}
          currentColor={currentColor}
          onDrawingModeToggle={handleDrawingModeToggle}
          onLEDGridToggle={() => setShowLEDGrid(!showLEDGrid)}
          onBrushSizeChange={setBrushSize}
          onColorChange={setCurrentColor}
          onClearAll={handleClearAll}
          onExportMapping={exportMapping}
          onImportMapping={importMapping}
          hasMapping={mappingCompleted && mappedCoordinates.length > 0}
        />
      </div>
    </div>
  );
};

export default CameraPanel;