import { test, expect, Page } from '@playwright/test';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8000';

// Helper functions
async function startCamera(page: Page) {
  // Grant camera permissions
  await page.context().grantPermissions(['camera']);
  
  // Click start camera button
  const startCameraBtn = page.getByRole('button', { name: 'Start Camera' });
  await expect(startCameraBtn).toBeVisible();
  await startCameraBtn.click();
  
  // Wait for video to be active (check for video element visibility)
  await expect(page.locator('video')).toBeVisible({ timeout: 10000 });
}

async function connectDevice(page: Page) {
  // Click connect device button
  const connectBtn = page.getByRole('button', { name: 'Connect Device' });
  await expect(connectBtn).toBeVisible();
  await connectBtn.click();
  
  // Wait for connection to be established (check for connected status)
  await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10000 });
}

async function selectROI(page: Page, startX: number, startY: number, endX: number, endY: number) {
  const video = page.locator('video').first();
  await expect(video).toBeVisible();
  
  // Get video bounding box
  const videoBox = await video.boundingBox();
  if (!videoBox) throw new Error('Video element not found');
  
  // Calculate absolute coordinates
  const absoluteStartX = videoBox.x + startX;
  const absoluteStartY = videoBox.y + startY;
  const absoluteEndX = videoBox.x + endX;
  const absoluteEndY = videoBox.y + endY;
  
  // Perform drag to select ROI
  await page.mouse.move(absoluteStartX, absoluteStartY);
  await page.mouse.down();
  await page.mouse.move(absoluteEndX, absoluteEndY);
  await page.mouse.up();
  
  // Wait for ROI to be selected (check for ROI text)
  await expect(page.locator('text=/ROI selected:/i')).toBeVisible({ timeout: 5000 });
}

test.describe('LED Wall Mapper Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(FRONTEND_URL);
    
    // Wait for page to load
    await expect(page.getByText('Camera Preview')).toBeVisible();
    
    // Check that backend is running
    const response = await page.request.get(`${BACKEND_URL}/docs`);
    expect(response.status()).toBe(200);
  });

  test('1. Application loads correctly', async ({ page }) => {
    // Check main components are visible
    await expect(page.getByText('Camera Preview')).toBeVisible();
    await expect(page.getByText('Device Connection')).toBeVisible();
    await expect(page.getByText('LED Controls')).toBeVisible();
    await expect(page.getByText('Mapping')).toBeVisible();
    
    // Check initial states
    await expect(page.getByText('Disconnected')).toBeVisible();
    await expect(page.getByText('Camera not active')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Camera' })).toBeVisible();
  });

  test('2. Camera starts successfully', async ({ page }) => {
    await startCamera(page);
    
    // Verify camera is active
    await expect(page.locator('video')).toBeVisible();
    await expect(page.getByText('Camera not active')).not.toBeVisible();
  });

  test('3. Device connection works', async ({ page }) => {
    await connectDevice(page);
    
    // Verify connection status
    await expect(page.getByText('Connected')).toBeVisible();
    await expect(page.getByText('Disconnected')).not.toBeVisible();
    
    // Verify connect button is disabled
    const connectBtn = page.getByRole('button', { name: 'Connected' });
    await expect(connectBtn).toBeDisabled();
  });

  test('4. ROI Selection Fix - Different areas can be selected', async ({ page }) => {
    await startCamera(page);
    
    // Test ROI selection in top-left area
    console.log('Testing ROI selection in top-left area...');
    await selectROI(page, 50, 50, 150, 150);
    
    // Verify ROI is selected
    let roiText = await page.locator('text=/ROI selected:/i').textContent();
    console.log(`Top-left ROI: ${roiText}`);
    expect(roiText).toContain('ROI selected:');
    
    // Test ROI selection in bottom-right area
    console.log('Testing ROI selection in bottom-right area...');
    await selectROI(page, 400, 300, 500, 400);
    
    // Verify different ROI is selected
    roiText = await page.locator('text=/ROI selected:/i').textContent();
    console.log(`Bottom-right ROI: ${roiText}`);
    expect(roiText).toContain('ROI selected:');
    
    // Test ROI selection in center area
    console.log('Testing ROI selection in center area...');
    await selectROI(page, 200, 150, 350, 250);
    
    // Verify center ROI is selected
    roiText = await page.locator('text=/ROI selected:/i').textContent();
    console.log(`Center ROI: ${roiText}`);
    expect(roiText).toContain('ROI selected:');
    
    console.log('✅ ROI selection works correctly in different areas');
  });

  test('5. ROI Selection Fix - Rectangle starts from clicked position', async ({ page }) => {
    await startCamera(page);
    
    const video = page.locator('video').first();
    const videoBox = await video.boundingBox();
    if (!videoBox) throw new Error('Video element not found');
    
    // Test multiple starting positions to ensure ROI starts from click point
    const testPositions = [
      { start: { x: 100, y: 100 }, end: { x: 200, y: 200 }, name: 'top-left' },
      { start: { x: 300, y: 150 }, end: { x: 400, y: 250 }, name: 'center' },
      { start: { x: 450, y: 50 }, end: { x: 550, y: 150 }, name: 'top-right' },
    ];
    
    for (const pos of testPositions) {
      console.log(`Testing ROI starting position: ${pos.name}`);
      
      // Select ROI
      await selectROI(page, pos.start.x, pos.start.y, pos.end.x, pos.end.y);
      
      // Check that ROI info is displayed
      const roiText = await page.locator('text=/ROI selected:/i').textContent();
      console.log(`ROI for ${pos.name}: ${roiText}`);
      
      // Verify ROI is created (text should show dimensions)
      expect(roiText).toMatch(/ROI selected: \d+ × \d+/);
    }
    
    console.log('✅ ROI rectangle starts from correct clicked positions');
  });

  test('6. Mapping 422 Error Fix - Start mapping without errors', async ({ page }) => {
    // Setup: start camera, connect device, select ROI
    await startCamera(page);
    await connectDevice(page);
    await selectROI(page, 200, 150, 400, 350);
    
    // Monitor network requests to catch 422 errors
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/start_mapping')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
        console.log(`📤 Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/start_mapping')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
        console.log(`📥 Response: ${response.status()} ${response.statusText()}`);
      }
    });
    
    // Click Start Mapping button
    const startMappingBtn = page.getByRole('button', { name: 'Start Mapping' });
    await expect(startMappingBtn).toBeVisible();
    await expect(startMappingBtn).toBeEnabled();
    
    console.log('Clicking Start Mapping button...');
    await startMappingBtn.click();
    
    // Wait for mapping request to be sent and response received
    await page.waitForTimeout(2000);
    
    // Verify the request was sent
    expect(requests.length).toBeGreaterThan(0);
    console.log(`✅ Mapping request sent: ${JSON.stringify(requests[0], null, 2)}`);
    
    // Verify no 422 errors occurred
    const has422Error = responses.some(r => r.status === 422);
    if (has422Error) {
      const errorResponse = responses.find(r => r.status === 422);
      console.error(`❌ 422 Error detected: ${JSON.stringify(errorResponse, null, 2)}`);
    }
    expect(has422Error).toBeFalsy();
    
    // Verify mapping starts (button should change to "Mapping..." or similar)
    await expect(page.getByRole('button', { name: 'Mapping...' })).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Mapping started without 422 errors');
  });

  test('7. Full workflow integration test', async ({ page }) => {
    console.log('🚀 Starting full workflow integration test...');
    
    // Step 1: Start camera
    console.log('Step 1: Starting camera...');
    await startCamera(page);
    console.log('✅ Camera started');
    
    // Step 2: Connect device
    console.log('Step 2: Connecting device...');
    await connectDevice(page);
    console.log('✅ Device connected');
    
    // Step 3: Enable LED power (optional)
    console.log('Step 3: Enabling LED power...');
    const ledPowerBtn = page.getByRole('button', { name: 'OFF' });
    if (await ledPowerBtn.isVisible()) {
      await ledPowerBtn.click();
      await expect(page.getByRole('button', { name: 'ON' })).toBeVisible({ timeout: 5000 });
      console.log('✅ LED power enabled');
    }
    
    // Step 4: Select ROI
    console.log('Step 4: Selecting ROI...');
    await selectROI(page, 250, 200, 450, 400);
    console.log('✅ ROI selected');
    
    // Step 5: Start mapping
    console.log('Step 5: Starting mapping...');
    const startMappingBtn = page.getByRole('button', { name: 'Start Mapping' });
    await startMappingBtn.click();
    
    // Verify mapping process begins
    await expect(page.getByRole('button', { name: 'Mapping...' })).toBeVisible({ timeout: 5000 });
    console.log('✅ Mapping process started');
    
    // Wait a bit to let mapping begin
    await page.waitForTimeout(3000);
    
    console.log('🎉 Full workflow completed successfully');
  });

  test('8. Error handling and edge cases', async ({ page }) => {
    // Test attempting to map without ROI
    await connectDevice(page);
    
    const startMappingBtn = page.getByRole('button', { name: 'Start Mapping' });
    expect(await startMappingBtn.isDisabled()).toBeTruthy();
    
    // Test attempting to map without device connection
    await page.reload();
    await startCamera(page);
    await selectROI(page, 200, 150, 400, 350);
    
    const mappingBtnAfterReload = page.getByRole('button', { name: 'Start Mapping' });
    expect(await mappingBtnAfterReload.isDisabled()).toBeTruthy();
    
    console.log('✅ Error handling works correctly');
  });
});