# LED Mapping Import Functionality

## Overview

The LED Wall Mapper now supports importing previously saved LED mapping JSON files. This feature allows you to:

1. Load saved LED mappings from JSON files
2. Resume drawing sessions with existing mappings
3. Share LED mappings between different setups
4. Backup and restore LED configurations

## Features

### Import Functionality
- **File Selection**: Click the "Import" button to select a JSON mapping file
- **Format Validation**: Automatic validation of the JSON structure
- **Error Handling**: Clear error messages for invalid files
- **Size Limits**: Files are limited to 10MB for security

### Data Restoration
- **LED Coordinates**: Restores all LED positions from the mapping file
- **ROI Information**: Restores the Region of Interest used during mapping
- **Video Dimensions**: Restores original video size for proper scaling
- **Canvas Rendering**: Automatically draws the imported mapping

### UI Integration
- **Import Button**: Located next to Export button in Drawing Tools Panel
- **Status Display**: Shows LED count and mapping information when loaded
- **Export Toggle**: Export button is only enabled when a mapping is available
- **Drawing Mode**: Seamlessly integrates with existing drawing functionality

## JSON File Format

The import function expects JSON files in this format:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "LED Mapping Name",
    "created": "2025-08-20T21:10:00.000Z",
    "totalLeds": 300,
    "validLeds": 285,
    "arrayStructure": {
      "wiring": "unknown"
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
  "originalROI": {
    "x": 320,
    "y": 115,
    "width": 640,
    "height": 640,
    "videoWidth": 1280,
    "videoHeight": 720
  },
  "leds": [
    {"index": 0, "x": 42, "y": 8},
    {"index": 1, "x": 52, "y": 18},
    ...
  ]
}
```

## Usage Instructions

### Basic Import Process
1. Click the **Import** button in the Drawing Tools Panel
2. Select a valid LED mapping JSON file from your computer
3. The system will validate the file format
4. If valid, the mapping will be loaded and displayed
5. You can now use the drawing functionality with the imported mapping

### File Requirements
- Must be a valid JSON file with `.json` extension
- Must follow the expected schema structure
- File size must be under 10MB
- LED coordinates must be valid numbers

### Error Handling
The system provides clear error messages for:
- Invalid file formats
- Corrupted JSON data
- Missing required fields
- Invalid coordinate data
- Files that are too large

## Coordinate System Conversion

The import function automatically handles coordinate system conversion:

1. **Canvas Coordinates**: Imported LEDs are in normalized canvas coordinates (160×90)
2. **ROI Mapping**: Coordinates are mapped from canvas space to ROI space
3. **Video Scaling**: Final coordinates are normalized to video dimensions (0-1 range)
4. **Drawing Integration**: Converted coordinates work seamlessly with drawing tools

## Integration with Existing Features

### Drawing Mode
- Imported mappings work immediately with drawing tools
- All brush sizes and colors are supported
- LED grid display shows imported LED positions
- Clear functionality works with imported mappings

### Export Functionality
- Import and then export to create backup copies
- Export maintains the same format for compatibility
- Metadata is preserved during import/export cycles

### Canvas Rendering
- LEDs are displayed as white dots with index labels
- ROI boundaries are shown
- Invalid LEDs (0,0 coordinates) are filtered out
- Canvas automatically scales to show all LEDs

## Example Usage Scenarios

### Backup and Restore
1. Create a mapping using the camera
2. Export the mapping to JSON
3. Later, import the JSON file to restore the exact configuration
4. Continue with drawing or make adjustments

### Configuration Sharing
1. One user creates a mapping and exports it
2. Other users import the same file
3. Everyone has the identical LED layout
4. Consistent drawing experiences across setups

### Multiple Configurations
1. Create different mappings for different LED arrangements
2. Export each configuration to separate JSON files
3. Quickly switch between configurations by importing different files
4. Support for multiple LED wall setups

## Technical Implementation

### File Processing
- Uses FileReader API for secure file reading
- JSON.parse with error handling for data extraction
- TypeScript interfaces ensure type safety
- Comprehensive validation before data acceptance

### State Management
- Updates React state for mapping coordinates
- Restores ROI and video dimensions
- Sets mapping completion status
- Triggers canvas redraw automatically

### Error Recovery
- Failed imports don't affect existing state
- Clear error messages guide user troubleshooting
- File input is reset after each attempt
- Graceful handling of all error conditions

## Troubleshooting

### Common Issues
- **"Invalid mapping file format"**: Ensure the JSON follows the expected schema
- **"File is too large"**: Reduce file size or compress JSON data
- **"Error reading file"**: Check file permissions and try again
- **LEDs not appearing**: Verify LED coordinates are within valid ranges

### Validation Checklist
- ✓ File has `.json` extension
- ✓ JSON is valid and parseable
- ✓ Contains all required fields (version, metadata, canvas, roi, originalROI, leds)
- ✓ LED coordinates are valid numbers
- ✓ File size is under 10MB

## Future Enhancements

Potential improvements for the import functionality:
- Support for additional file formats (CSV, XML)
- Batch import of multiple mapping files
- Import from URLs or cloud storage
- Mapping file compression and optimization
- Advanced validation with detailed error reporting