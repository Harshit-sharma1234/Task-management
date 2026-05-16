const puppeteer = require('puppeteer');

async function runTest() {
  console.log('Starting E2E Shortcut Test...');
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to dashboard
    console.log('Navigating to http://localhost:3000/dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    
    // Wait for the workspace to be determined (redirect)
    // NOTE: This assumes you are already logged in in your local browser profile 
    // or the app has a default dev session.
    await new Promise(r => setTimeout(r, 2000)); 
    
    const baseUrl = page.url();
    console.log(`Initial URL: ${baseUrl}`);

    if (baseUrl.includes('/login')) {
      console.warn('Redirected to login. E2E shortcut tests require an active session.');
      console.warn('Please log in manually in a non-headless browser or provide test credentials.');
      return;
    }

    // Helper to test a shortcut
    const testShortcut = async (keys, expectedQuery) => {
      console.log(`\n--- Testing Shortcut: ${keys.toUpperCase()} ---`);
      
      // Type keys sequentially
      for (const key of keys.toLowerCase()) {
        await page.keyboard.press(key);
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Wait for navigation/URL update
      await new Promise(r => setTimeout(r, 2500)); 
      
      const currentUrl = page.url();
      const success = currentUrl.includes(expectedQuery);
      
      if (success) {
        console.log(`✅ Success: Navigated to ${currentUrl}`);
      } else {
        console.error(`❌ Failure: URL is ${currentUrl}, expected to contain "${expectedQuery}"`);
      }
      return success;
    };

    // Run tests
    let results = [];
    results.push(await testShortcut('go', '/issues'));
    results.push(await testShortcut('ga', 'filter=active'));
    results.push(await testShortcut('gb', 'filter=backlog'));
    results.push(await testShortcut('gu', 'filter=urgent'));
    results.push(await testShortcut('gy', 'filter=assigned'));

    const passed = results.filter(r => r).length;
    console.log(`\nSummary: ${passed}/${results.length} tests passed.`);

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    console.log('Test complete.');
  }
}

runTest();
