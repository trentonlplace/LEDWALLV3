import React, { useState, useCallback } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from './ui/card';
import type { RGBColor, HSLColor } from '../types';

interface DrawingToolsPanelProps {
  isDrawingMode: boolean;
  showLEDGrid: boolean;
  brushSize: number;
  currentColor: RGBColor;
  onDrawingModeToggle: () => void;
  onLEDGridToggle: () => void;
  onBrushSizeChange: (size: number) => void;
  onColorChange: (color: RGBColor) => void;
  onClearAll: () => void;
}

const DrawingToolsPanel: React.FC<DrawingToolsPanelProps> = ({
  isDrawingMode,
  showLEDGrid,
  brushSize,
  currentColor,
  onDrawingModeToggle,
  onLEDGridToggle,
  onBrushSizeChange,
  onColorChange,
  onClearAll
}) => {
  const [colorMode, setColorMode] = useState<'rgb' | 'hsl'>('rgb');
  const [hslColor, setHslColor] = useState<HSLColor>({ h: 0, s: 100, l: 50 });

  // Convert RGB to HSL
  const rgbToHsl = useCallback((r: number, g: number, b: number): HSLColor => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }

      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }, []);

  // Convert HSL to RGB
  const hslToRgb = useCallback((h: number, s: number, l: number): RGBColor => {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }, []);

  // Handle RGB color changes
  const handleRGBChange = useCallback((component: 'r' | 'g' | 'b', value: number) => {
    const newColor = { ...currentColor, [component]: value };
    onColorChange(newColor);
    setHslColor(rgbToHsl(newColor.r, newColor.g, newColor.b));
  }, [currentColor, onColorChange, rgbToHsl]);

  // Handle HSL color changes
  const handleHSLChange = useCallback((component: 'h' | 's' | 'l', value: number) => {
    const newHslColor = { ...hslColor, [component]: value };
    setHslColor(newHslColor);
    const newRgbColor = hslToRgb(newHslColor.h, newHslColor.s, newHslColor.l);
    onColorChange(newRgbColor);
  }, [hslColor, hslToRgb, onColorChange]);

  // Preset colors
  const presetColors: RGBColor[] = [
    { r: 255, g: 0, b: 0 },     // Red
    { r: 0, g: 255, b: 0 },     // Green  
    { r: 0, g: 0, b: 255 },     // Blue
    { r: 255, g: 255, b: 0 },   // Yellow
    { r: 255, g: 0, b: 255 },   // Magenta
    { r: 0, g: 255, b: 255 },   // Cyan
    { r: 255, g: 128, b: 0 },   // Orange
    { r: 128, g: 0, b: 128 },   // Purple
    { r: 255, g: 192, b: 203 }, // Pink
    { r: 255, g: 255, b: 255 }, // White
  ];

  const currentColorString = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Drawing Tools
          <button
            onClick={onDrawingModeToggle}
            className={`px-4 py-2 rounded-lg font-medium ${
              isDrawingMode
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isDrawingMode ? 'DRAWING ON' : 'DRAW!'}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drawing Controls */}
        <div className="space-y-4">
          {/* LED Grid Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">LED Grid</label>
            <button
              onClick={onLEDGridToggle}
              className={`px-3 py-1 rounded-lg text-sm ${
                showLEDGrid
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {showLEDGrid ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Brush Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Brush Size</label>
              <span className="text-sm text-gray-500">{brushSize}px</span>
            </div>
            <input
              type="range"
              min={3}
              max={20}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Color Picker */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Color</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setColorMode('rgb')}
                className={`px-2 py-1 text-xs rounded ${
                  colorMode === 'rgb' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                RGB
              </button>
              <button
                onClick={() => setColorMode('hsl')}
                className={`px-2 py-1 text-xs rounded ${
                  colorMode === 'hsl' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                HSL
              </button>
            </div>
          </div>

          {/* Current Color Preview */}
          <div className="flex items-center space-x-3">
            <div
              className="w-12 h-12 rounded-lg border-2 border-gray-300"
              style={{ backgroundColor: currentColorString }}
            ></div>
            <div className="text-sm">
              <div>RGB: ({currentColor.r}, {currentColor.g}, {currentColor.b})</div>
              <div>HSL: ({hslColor.h}°, {hslColor.s}%, {hslColor.l}%)</div>
            </div>
          </div>

          {/* Color Controls */}
          {colorMode === 'rgb' ? (
            <div className="space-y-3">
              {/* Red */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-sm">Red</label>
                  <span className="text-sm">{currentColor.r}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={currentColor.r}
                  onChange={(e) => handleRGBChange('r', Number(e.target.value))}
                  className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Green */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-sm">Green</label>
                  <span className="text-sm">{currentColor.g}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={currentColor.g}
                  onChange={(e) => handleRGBChange('g', Number(e.target.value))}
                  className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Blue */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-sm">Blue</label>
                  <span className="text-sm">{currentColor.b}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={currentColor.b}
                  onChange={(e) => handleRGBChange('b', Number(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Hue */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-sm">Hue</label>
                  <span className="text-sm">{hslColor.h}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={hslColor.h}
                  onChange={(e) => handleHSLChange('h', Number(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-cyan-500 via-blue-500 via-purple-500 to-red-500 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-sm">Saturation</label>
                  <span className="text-sm">{hslColor.s}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={hslColor.s}
                  onChange={(e) => handleHSLChange('s', Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Lightness */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-sm">Lightness</label>
                  <span className="text-sm">{hslColor.l}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={hslColor.l}
                  onChange={(e) => handleHSLChange('l', Number(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-black via-gray-500 to-white rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Preset Colors */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Presets</label>
            <div className="grid grid-cols-5 gap-2">
              {presetColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => onColorChange(color)}
                  className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                  style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                  title={`RGB(${color.r}, ${color.g}, ${color.b})`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onClearAll}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Clear All
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DrawingToolsPanel;