import { chromium } from 'playwright';

async function debugMappingFlow() {
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Monitor console messages
    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type()}]:`, msg.text());
    });
    
    // Monitor network requests
    page.on('request', request => {
        if (request.url().includes('start_mapping') || request.url().includes('3000')) {
            console.log(`[REQUEST] ${request.method()} ${request.url()}`);
            console.log(`[REQUEST HEADERS]:`, request.headers());
            if (request.postData()) {
                console.log(`[REQUEST BODY]:`, request.postData());
            }
        }
    });
    
    // Monitor network responses
    page.on('response', response => {
        if (response.url().includes('start_mapping') || response.url().includes('3000')) {
            console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
        }
    });
    
    // Monitor JavaScript errors
    page.on('pageerror', error => {
        console.log(`[PAGE ERROR]:`, error.message);
    });
    
    try {
        console.log('🔍 Starting LED Wall Mapper debugging...');
        
        // Navigate to the application
        await page.goto('http://localhost:3001');
        console.log('✅ Navigated to http://localhost:3001');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Check initial page state
        console.log('\n📊 Initial Page State:');
        const startCameraButton = await page.locator('button:has-text("Start Camera")');
        const connectDeviceButton = await page.locator('button:has-text("Connect Device")');
        const startMappingButton = await page.locator('button:has-text("Start Mapping")');
        
        console.log(`Start Camera enabled: ${await startCameraButton.isEnabled()}`);
        console.log(`Connect Device enabled: ${await connectDeviceButton.isEnabled()}`);
        console.log(`Start Mapping enabled: ${await startMappingButton.isEnabled()}`);
        
        // Step 1: Start Camera
        console.log('\n🎥 Step 1: Starting Camera...');
        if (await startCameraButton.isEnabled()) {
            await startCameraButton.click();
            await page.waitForTimeout(2000); // Wait for camera to initialize
            
            // Check if video stream is working
            const video = await page.locator('video');
            if (await video.count() > 0) {
                console.log('✅ Video element found');
                const videoReady = await video.evaluate(v => v.readyState >= 2);
                console.log(`Video ready state: ${videoReady}`);
            }
        }
        
        // Step 2: Connect Device
        console.log('\n🔌 Step 2: Connecting Device...');
        await page.waitForTimeout(1000);
        
        if (await connectDeviceButton.isEnabled()) {
            await connectDeviceButton.click();
            await page.waitForTimeout(2000); // Wait for device connection
            
            // Check connection status
            const statusText = await page.locator('.status, .connection-status, [class*="status"]').allTextContents();
            console.log('Status messages:', statusText);
        }
        
        // Step 3: Check ROI selection
        console.log('\n📐 Step 3: Checking ROI Selection...');
        await page.waitForTimeout(1000);
        
        // Look for ROI canvas or selection area
        const roiCanvas = await page.locator('canvas');
        if (await roiCanvas.count() > 0) {
            console.log(`✅ Found ${await roiCanvas.count()} canvas element(s)`);
            
            // Try to click on canvas to set ROI
            const firstCanvas = roiCanvas.first();
            const boundingBox = await firstCanvas.boundingBox();
            if (boundingBox) {
                console.log('🖱️  Simulating ROI selection...');
                // Click and drag to create ROI
                await page.mouse.move(boundingBox.x + 50, boundingBox.y + 50);
                await page.mouse.down();
                await page.mouse.move(boundingBox.x + 200, boundingBox.y + 150);
                await page.mouse.up();
                await page.waitForTimeout(1000);
            }
        }
        
        // Step 4: Analyze Start Mapping button state
        console.log('\n🚀 Step 4: Analyzing Start Mapping Button...');
        
        // Check button state before clicking
        const buttonEnabled = await startMappingButton.isEnabled();
        const buttonVisible = await startMappingButton.isVisible();
        const buttonText = await startMappingButton.textContent();
        
        console.log(`Button visible: ${buttonVisible}`);
        console.log(`Button enabled: ${buttonEnabled}`);
        console.log(`Button text: "${buttonText}"`);
        
        // Get button attributes
        const buttonClass = await startMappingButton.getAttribute('class');
        const buttonDisabled = await startMappingButton.getAttribute('disabled');
        console.log(`Button class: ${buttonClass}`);
        console.log(`Button disabled attribute: ${buttonDisabled}`);
        
        // Check for any loading states or conditions
        const loadingElements = await page.locator('.loading, [class*="loading"], .spinner, [class*="spinner"]').count();
        console.log(`Loading elements found: ${loadingElements}`);
        
        // Step 5: Attempt to click Start Mapping
        console.log('\n🎯 Step 5: Attempting to click Start Mapping...');
        
        if (buttonEnabled) {
            console.log('Button is enabled, attempting click...');
            
            // Add network monitoring specifically for the click
            const requestPromise = page.waitForRequest(request => 
                request.url().includes('start_mapping'), { timeout: 5000 }
            ).catch(() => null);
            
            const responsePromise = page.waitForResponse(response => 
                response.url().includes('start_mapping'), { timeout: 5000 }
            ).catch(() => null);
            
            // Click the button
            await startMappingButton.click();
            console.log('✅ Button clicked');
            
            // Wait for network activity
            const [request, response] = await Promise.all([requestPromise, responsePromise]);
            
            if (request) {
                console.log(`✅ Request sent: ${request.method()} ${request.url()}`);
                console.log(`Request headers:`, request.headers());
                if (request.postData()) {
                    console.log(`Request body:`, request.postData());
                }
            } else {
                console.log('❌ No request was sent to start_mapping endpoint');
            }
            
            if (response) {
                console.log(`✅ Response received: ${response.status()}`);
                const responseBody = await response.text().catch(() => 'Could not read response body');
                console.log(`Response body:`, responseBody);
            } else {
                console.log('❌ No response received from start_mapping endpoint');
            }
            
        } else {
            console.log('❌ Button is disabled, investigating why...');
            
            // Check for validation errors or missing requirements
            const errorMessages = await page.locator('.error, [class*="error"], .warning, [class*="warning"]').allTextContents();
            console.log('Error/Warning messages:', errorMessages);
            
            // Check form validation state
            const formInputs = await page.locator('input, select').all();
            for (let input of formInputs) {
                const name = await input.getAttribute('name') || await input.getAttribute('id') || 'unnamed';
                const value = await input.inputValue().catch(() => 'N/A');
                const required = await input.getAttribute('required');
                const valid = await input.evaluate(el => el.checkValidity()).catch(() => 'N/A');
                console.log(`Input ${name}: value="${value}", required=${required}, valid=${valid}`);
            }
        }
        
        // Step 6: Check application state after click attempt
        console.log('\n📊 Step 6: Post-click Application State...');
        await page.waitForTimeout(2000);
        
        // Check for any state changes
        const finalButtonState = await startMappingButton.isEnabled();
        const finalButtonText = await startMappingButton.textContent();
        console.log(`Final button state - enabled: ${finalButtonState}, text: "${finalButtonText}"`);
        
        // Check for any new elements or state indicators
        const progressElements = await page.locator('.progress, [class*="progress"], .mapping, [class*="mapping"]').count();
        console.log(`Progress/mapping elements found: ${progressElements}`);
        
        // Check browser network tab for any failed requests
        console.log('\n🌐 Network Analysis Complete');
        
        // Keep browser open for manual inspection
        console.log('\n⏸️  Browser will remain open for manual inspection. Press Ctrl+C to close.');
        
        // Wait for manual inspection
        await page.waitForTimeout(60000); // Wait 1 minute for manual inspection
        
    } catch (error) {
        console.error('❌ Error during debugging:', error);
    }
    
    console.log('\n🔍 Debugging session complete. Check the console output above for issues.');
    await browser.close();
}

// Run the debug script
debugMappingFlow().catch(console.error);