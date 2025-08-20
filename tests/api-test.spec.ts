import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8000';

test.describe('API Direct Tests', () => {
  test('Direct API test - 422 Error Fix verification', async ({ request }) => {
    // First connect to device
    console.log('Connecting to device...');
    const connectResponse = await request.post(`${BACKEND_URL}/device/connect`, {
      data: {
        port: null,
        baud: null
      }
    });
    
    console.log(`Connect response: ${connectResponse.status()}`);
    const connectData = await connectResponse.json();
    console.log('Connect data:', connectData);
    expect(connectResponse.status()).toBe(200);
    
    // Test mapping with valid ROI data
    console.log('Testing mapping API...');
    const mappingResponse = await request.post(`${BACKEND_URL}/start_mapping`, {
      data: {
        roi: {
          x: 0.2,
          y: 0.2, 
          w: 0.4,
          h: 0.4
        },
        brightness: 0.5,
        ledPower: false,
        num_leds: 300
      }
    });
    
    console.log(`Mapping response status: ${mappingResponse.status()}`);
    
    // Check if we get a 422 error
    if (mappingResponse.status() === 422) {
      const errorData = await mappingResponse.json();
      console.error('❌ 422 Error detected:', errorData);
      expect(mappingResponse.status()).not.toBe(422);
    } else {
      console.log(`✅ No 422 error. Response status: ${mappingResponse.status()}`);
      const responseData = await mappingResponse.json();
      console.log('Response data:', responseData);
    }
    
    // Verify response is not 422
    expect(mappingResponse.status()).not.toBe(422);
  });

  test('ROI parameter validation test', async ({ request }) => {
    // Connect first
    await request.post(`${BACKEND_URL}/device/connect`, {
      data: { port: null, baud: null }
    });

    // Test different ROI formats to verify fix
    const testCases = [
      {
        name: 'Normalized coordinates (0-1)',
        roi: { x: 0.2, y: 0.2, w: 0.4, h: 0.4 }
      },
      {
        name: 'Alternative format with width/height',
        roi: { x: 0.1, y: 0.1, width: 0.3, height: 0.3 }
      },
      {
        name: 'Edge case - small ROI',
        roi: { x: 0.0, y: 0.0, w: 0.1, h: 0.1 }
      }
    ];

    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`);
      
      const response = await request.post(`${BACKEND_URL}/start_mapping`, {
        data: {
          roi: testCase.roi,
          brightness: 0.5,
          ledPower: false,
          num_leds: 300
        }
      });

      console.log(`${testCase.name} - Status: ${response.status()}`);
      
      if (response.status() === 422) {
        const errorData = await response.json();
        console.log(`422 Error for ${testCase.name}:`, errorData);
      }
      
      // Should not be 422 if the fix is working
      expect(response.status()).not.toBe(422);
    }
  });
});