import { chromium } from 'playwright';

async function debugFetchIssue() {
    const browser = await chromium.launch({ 
        headless: false,
        devtools: true
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Monitor all network activity
    page.on('request', request => {
        console.log(`[REQUEST] ${request.method()} ${request.url()}`);
        if (request.url().includes('start_mapping')) {
            console.log('[MAPPING REQUEST] Headers:', request.headers());
            console.log('[MAPPING REQUEST] Body:', request.postData());
        }
    });
    
    page.on('response', response => {
        console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
    });
    
    // Monitor console messages for errors
    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type()}]:`, msg.text());
    });
    
    // Monitor JavaScript errors
    page.on('pageerror', error => {
        console.log(`[PAGE ERROR]:`, error.message);
    });
    
    try {
        console.log('🔍 Debugging fetch issue in Start Mapping...');
        
        await page.goto('http://localhost:3001');
        await page.waitForLoadState('networkidle');
        
        // Setup flow: Start Camera → Connect Device → Set ROI
        console.log('\n🎥 Starting camera...');
        await page.click('button:has-text("Start Camera")');
        await page.waitForTimeout(2000);
        
        console.log('\n🔌 Connecting device...');
        await page.click('button:has-text("Connect Device")');
        await page.waitForTimeout(2000);
        
        console.log('\n📐 Setting ROI...');
        const canvas = await page.locator('canvas').first();
        const boundingBox = await canvas.boundingBox();
        if (boundingBox) {
            await page.mouse.move(boundingBox.x + 50, boundingBox.y + 50);
            await page.mouse.down();
            await page.mouse.move(boundingBox.x + 200, boundingBox.y + 150);
            await page.mouse.up();
            await page.waitForTimeout(1000);
        }
        
        // Add debugging to the page
        await page.evaluate(() => {
            console.log('🔧 Adding fetch debugging...');
            
            // Store original fetch
            const originalFetch = window.fetch;
            
            // Override fetch to add debugging
            window.fetch = function(...args) {
                console.log('🌐 FETCH CALLED:', args);
                
                // Call original fetch and log result
                const fetchPromise = originalFetch.apply(this, args);
                
                fetchPromise.then(response => {
                    console.log('✅ FETCH SUCCESS:', response.status, response.url);
                }).catch(error => {
                    console.log('❌ FETCH ERROR:', error);
                });
                
                return fetchPromise;
            };
            
            // Also debug video dimensions
            const video = document.querySelector('video');
            if (video) {
                console.log('📹 Video dimensions:', {
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    clientWidth: video.clientWidth,
                    clientHeight: video.clientHeight,
                    readyState: video.readyState
                });
            }
            
            console.log('🔧 Debugging setup complete');
        });
        
        console.log('\n🚀 Clicking Start Mapping...');
        
        // Click the Start Mapping button
        await page.click('button:has-text("Start Mapping")');
        
        // Wait a bit to see what happens
        await page.waitForTimeout(5000);
        
        console.log('\n📊 Checking video state after click...');
        const videoState = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? {
                videoWidth: video.videoWidth,
                videoHeight: video.videoHeight,
                readyState: video.readyState,
                paused: video.paused,
                src: video.src
            } : null;
        });
        console.log('Video state:', videoState);
        
        // Keep browser open for manual inspection
        console.log('\n⏸️  Browser will remain open for manual inspection. Press Ctrl+C to close.');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Error during debugging:', error);
    }
    
    await browser.close();
}

debugFetchIssue().catch(console.error);