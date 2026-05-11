const puppeteer = require('puppeteer');

/**
 * ── COMMAND PALETTE E2E TEST ──
 * This test verifies that Command Palette shortcuts correctly update the UI and Database.
 * 
 * Prerequisites:
 * 1. App running at http://localhost:3000
 * 2. An active session (logged in)
 */

async function runTest() {
  console.log('🚀 Starting Command Palette E2E Test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI, false to watch it happen
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Navigate to dashboard
    console.log('📡 Navigating to http://localhost:3000/dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
    
    // Check for login redirect
    if (page.url().includes('/login')) {
      console.error('❌ Error: Not logged in. Please log in manually or configure test credentials.');
      await browser.close();
      return;
    }

    // 2. Open Command Palette (Cmd+K)
    console.log('⌨️ Opening Command Palette (Meta+K)...');
    await page.keyboard.down('Meta');
    await page.keyboard.press('k');
    await page.keyboard.up('Meta');
    
    // Wait for palette to appear
    await page.waitForSelector('input[placeholder*="Search"]', { visible: true });
    console.log('✅ Command Palette opened.');

    // 3. Test Navigation Shortcut (GD -> Dashboard)
    console.log('⌨️ Testing Navigation Shortcut: G then D (Go to Dashboard)...');
    await page.keyboard.press('g');
    await page.keyboard.press('d');
    await new Promise(r => setTimeout(r, 2000));
    console.log(`📍 Current URL: ${page.url()}`);

    // 4. Test Project Context Menu (Select a project first)
    // We'll search for "Project" and enter
    console.log('⌨️ Selecting a project from the palette...');
    await page.keyboard.down('Meta');
    await page.keyboard.press('k');
    await page.keyboard.up('Meta');
    await page.waitForSelector('input[placeholder*="Search"]', { visible: true });
    
    await page.keyboard.type('Project');
    await new Promise(r => setTimeout(r, 500));
    await page.keyboard.press('Enter'); // Select the first project in the list
    console.log('✅ Project selected.');

    // 5. Trigger Project Status Change (PS)
    console.log('⌨️ Triggering Project Status change (P then S)...');
    await page.keyboard.press('p');
    await page.keyboard.press('s');
    
    // Wait for context menu
    await page.waitForSelector('input[placeholder*="Set status"]', { visible: true });
    console.log('✅ Status context menu opened.');

    // 6. Select "In Review"
    console.log('⌨️ Selecting "In Review"...');
    await page.keyboard.type('In Review');
    await new Promise(r => setTimeout(r, 500));
    await page.keyboard.press('Enter');
    
    console.log('⏳ Waiting for optimistic update and server revalidation...');
    await new Promise(r => setTimeout(r, 3000));

    // 7. Verify UI Update (Check for "IN REVIEW" text and purple dot)
    const statusText = await page.evaluate(() => {
      // Find the status span in the project header or list
      const spans = Array.from(document.querySelectorAll('span'));
      const statusSpan = spans.find(s => s.innerText.toLowerCase().includes('in review'));
      return statusSpan ? statusSpan.innerText : null;
    });

    if (statusText) {
      console.log(`✅ UI Success: Found status text "${statusText}"`);
    } else {
      console.error('❌ UI Failure: Could not find "In Review" status text on page.');
    }

    // 8. Verify Persistence (Refresh)
    console.log('🔄 Refreshing page to verify database persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const persistedStatus = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      const statusSpan = spans.find(s => s.innerText.toLowerCase().includes('in review'));
      return statusSpan ? statusSpan.innerText : null;
    });

    if (persistedStatus) {
      console.log('✅ DB Success: Status persisted after refresh.');
    } else {
      console.error('❌ DB Failure: Status did not persist after refresh.');
    }

  } catch (err) {
    console.error('💥 Test Failed with error:', err);
  } finally {
    console.log('🏁 Test run complete.');
    // Keep browser open for a bit to see result if headless is false
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

runTest();
