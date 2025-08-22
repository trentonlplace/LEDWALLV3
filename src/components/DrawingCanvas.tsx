import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { 
  LEDCoordinate, 
  DrawingPoint, 
  DrawingLine, 
  RGBColor,
  ROI
} from '../types';

interface DrawingCanvasProps {
  ledCoordinates: LEDCoordinate[];
  roi: ROI;
  originalVideoWidth: number;
  originalVideoHeight: number;
  isDrawingMode: boolean;
  showLEDGrid: boolean;
  brushSize: number;
  currentColor: RGBColor;
  onDrawingComplete: (lines: DrawingLine[]) => void;
  onLEDsUpdate: (ledUpdates: { index: number; color: RGBColor }[]) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  ledCoordinates,
  originalVideoWidth,
  originalVideoHeight,
  isDrawingMode,
  showLEDGrid,
  brushSize,
  currentColor,
  onDrawingComplete,
  onLEDsUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<DrawingPoint[]>([]);
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [lastPoint, setLastPoint] = useState<DrawingPoint | null>(null);

  // Calculate canvas dimensions based on full video aspect ratio (not ROI)
  const videoAspectRatio = originalVideoWidth / originalVideoHeight;
  const maxWidth = 800; // Maximum width to fit in card
  const maxHeight = 600; // Maximum height to prevent overflow
  
  let containerWidth = maxWidth;
  let canvasHeight = containerWidth / videoAspectRatio;
  
  // If height exceeds max, scale down
  if (canvasHeight > maxHeight) {
    canvasHeight = maxHeight;
    containerWidth = canvasHeight * videoAspectRatio;
  }

  // Calculate average distance between LEDs for proximity algorithm
  const calculateAverageDistance = useCallback(() => {
    if (ledCoordinates.length < 2) return 0.05; // Default fallback
    
    let totalDistance = 0;
    let count = 0;
    
    for (let i = 0; i < ledCoordinates.length; i++) {
      for (let j = i + 1; j < Math.min(i + 5, ledCoordinates.length); j++) {
        const coord1 = ledCoordinates[i];
        const coord2 = ledCoordinates[j];
        
        // Skip LEDs that weren't found (0,0 coordinates)
        if ((coord1.x === 0 && coord1.y === 0) || (coord2.x === 0 && coord2.y === 0)) {
          continue;
        }
        
        const dx = coord1.x - coord2.x;
        const dy = coord1.y - coord2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        totalDistance += distance;
        count++;
      }
    }
    
    return count > 0 ? totalDistance / count : 0.05;
  }, [ledCoordinates]);

  // Convert canvas coordinates to normalized video frame coordinates
  const canvasToNormalized = useCallback((canvasX: number, canvasY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Convert directly to full frame normalized coordinates (0-1)
    const normalizedX = canvasX / canvas.width;
    const normalizedY = canvasY / canvas.height;
    
    return { x: normalizedX, y: normalizedY };
  }, []);

  // Convert normalized coordinates to canvas coordinates
  const normalizedToCanvas = useCallback((normalizedX: number, normalizedY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Convert directly from normalized to canvas coordinates
    const canvasX = normalizedX * canvas.width;
    const canvasY = normalizedY * canvas.height;
    
    return { x: canvasX, y: canvasY };
  }, []);

  // Calculate distance from point to line segment
  const distanceToLineSegment = useCallback((point: DrawingPoint, lineStart: DrawingPoint, lineEnd: DrawingPoint) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      // Line segment is a point
      return Math.sqrt(A * A + B * B);
    }
    
    let param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Update LEDs based on drawn lines - ONLY update affected LEDs
  const updateLEDsFromLines = useCallback((allLines: DrawingLine[]) => {
    console.log('🎨 updateLEDsFromLines called with', allLines.length, 'lines');
    
    if (allLines.length === 0) {
      console.log('🗑️ No lines - turning off all LEDs');
      // Only when explicitly clearing all lines, turn off all LEDs
      const ledUpdates = ledCoordinates.map((_, index) => ({
        index,
        color: { r: 0, g: 0, b: 0 }
      }));
      onLEDsUpdate(ledUpdates);
      return;
    }

    const averageDistance = calculateAverageDistance();
    const proximityThreshold = averageDistance / 2;
    const ledUpdates: { index: number; color: RGBColor }[] = [];

    console.log('🔍 Checking LED proximity with threshold:', proximityThreshold);

    ledCoordinates.forEach((ledCoord, index) => {
      // Skip LEDs that weren't found
      if (ledCoord.x === 0 && ledCoord.y === 0) return;

      let closestDistance = Infinity;
      let closestColor: RGBColor | null = null;

      // Check distance to all line segments
      allLines.forEach((line) => {
        for (let i = 0; i < line.points.length - 1; i++) {
          const start = line.points[i];
          const end = line.points[i + 1];
          
          const distance = distanceToLineSegment(ledCoord, start, end);
          
          if (distance < proximityThreshold && distance < closestDistance) {
            closestDistance = distance;
            // Parse color from CSS string
            const colorMatch = line.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (colorMatch) {
              closestColor = {
                r: parseInt(colorMatch[1]),
                g: parseInt(colorMatch[2]),
                b: parseInt(colorMatch[3])
              };
            }
          }
        }
      });

      // ONLY update LEDs that are close to lines (affected LEDs)
      if (closestColor) {
        ledUpdates.push({ index, color: closestColor });
      }
      // Do NOT turn off LEDs that aren't close - leave them as they are
    });

    console.log('💡 Updating', ledUpdates.length, 'affected LEDs (not all 64)');
    console.log('🔍 Sample LED updates:', ledUpdates.slice(0, 3));
    onLEDsUpdate(ledUpdates);
  }, [ledCoordinates, calculateAverageDistance, distanceToLineSegment, onLEDsUpdate]);

  // Draw everything on the canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ROI outline removed for clarity - LEDs show the actual mapped area

    // Draw LED positions if grid is visible
    if (showLEDGrid) {
      ledCoordinates.forEach((coord, index) => {
        // Skip LEDs that weren't found
        if (coord.x === 0 && coord.y === 0) return;
        
        const canvasPos = normalizedToCanvas(coord.x, coord.y);
        
        // Draw LED as small circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(canvasPos.x, canvasPos.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw LED number
        ctx.fillStyle = '#ffff00';
        ctx.font = '10px Arial';
        ctx.fillText(index.toString(), canvasPos.x + 5, canvasPos.y - 5);
      });
    }

    // Draw completed lines
    lines.forEach((line) => {
      if (line.points.length < 2) return;
      
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      const firstPoint = line.points[0];
      const firstCanvas = normalizedToCanvas(firstPoint.x, firstPoint.y);
      ctx.moveTo(firstCanvas.x, firstCanvas.y);
      
      for (let i = 1; i < line.points.length; i++) {
        const point = line.points[i];
        const canvasPos = normalizedToCanvas(point.x, point.y);
        ctx.lineTo(canvasPos.x, canvasPos.y);
      }
      
      ctx.stroke();
    });

    // Draw current line being drawn
    if (currentLine.length >= 2) {
      ctx.strokeStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      const firstPoint = currentLine[0];
      const firstCanvas = normalizedToCanvas(firstPoint.x, firstPoint.y);
      ctx.moveTo(firstCanvas.x, firstCanvas.y);
      
      for (let i = 1; i < currentLine.length; i++) {
        const point = currentLine[i];
        const canvasPos = normalizedToCanvas(point.x, point.y);
        ctx.lineTo(canvasPos.x, canvasPos.y);
      }
      
      ctx.stroke();
    }
  }, [lines, currentLine, showLEDGrid, ledCoordinates, normalizedToCanvas, currentColor, brushSize]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    console.log('🖱️ MOUSE DOWN: isDrawingMode =', isDrawingMode);
    console.log('🖱️ MOUSE DOWN: Event target =', e.currentTarget);
    console.log('🖱️ MOUSE DOWN: Canvas dimensions =', e.currentTarget.width, 'x', e.currentTarget.height);
    if (!isDrawingMode) {
      console.log('❌ Drawing disabled - not in drawing mode');
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ Canvas ref not found');
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('🎯 Mouse position:', { x, y });
    
    const normalizedPoint = canvasToNormalized(x, y);
    console.log('📍 Normalized point:', normalizedPoint);
    
    setIsDrawing(true);
    setCurrentLine([normalizedPoint]);
    setLastPoint(normalizedPoint);
    console.log('✅ Started drawing');
  }, [isDrawingMode, canvasToNormalized]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawingMode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const normalizedPoint = canvasToNormalized(x, y);
    
    // Add point with distance threshold to smooth lines
    if (lastPoint) {
      const dx = normalizedPoint.x - lastPoint.x;
      const dy = normalizedPoint.y - lastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 0.001) { // Minimum distance threshold
        console.log('🖱️ MOUSE MOVE: Adding point', normalizedPoint);
        setCurrentLine(prev => [...prev, normalizedPoint]);
        setLastPoint(normalizedPoint);
      }
    }
  }, [isDrawing, isDrawingMode, canvasToNormalized, lastPoint]);

  const handleMouseUp = useCallback(() => {
    console.log('🖱️ MOUSE UP: isDrawing =', isDrawing, 'currentLine.length =', currentLine.length);
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentLine.length >= 2) {
      const newLine: DrawingLine = {
        id: Date.now().toString(),
        points: [...currentLine],
        color: `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`,
        width: brushSize
      };
      
      console.log('✏️ Created new line:', newLine);
      
      const newLines = [...lines, newLine];
      setLines(newLines);
      onDrawingComplete(newLines);
      
      // Update LEDs immediately when stroke is completed
      console.log('💡 Stroke completed, updating LEDs now');
      updateLEDsFromLines(newLines);
    } else {
      console.log('⚠️ Line too short, not saving');
    }
    
    setCurrentLine([]);
    setLastPoint(null);
  }, [isDrawing, currentLine, lines, currentColor, brushSize, onDrawingComplete, updateLEDsFromLines]);

  // Clear all drawings - this will trigger LED update via stroke completion logic
  const clearCanvas = useCallback(() => {
    console.log('🗑️ CLEAR CANVAS: Clearing all lines');
    setLines([]);
    setCurrentLine([]);
    onDrawingComplete([]);
    // Trigger LED clear by calling updateLEDsFromLines with empty lines
    console.log('🗑️ CLEAR CANVAS: Updating LEDs to turn all off');
    updateLEDsFromLines([]);
  }, [onDrawingComplete, updateLEDsFromLines]);

  // Effect to redraw canvas when state changes
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // NOTE: Removed automatic LED clearing to prevent unwanted serial communications
  // LEDs will only be updated on stroke completion or explicit clear button press

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={containerWidth}
        height={canvasHeight}
        className="border border-gray-300 rounded-lg cursor-crosshair bg-black"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDrawingMode ? 'crosshair' : 'default'
        }}
      />
      
      {lines.length > 0 && (
        <button
          onClick={clearCanvas}
          className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default DrawingCanvas;