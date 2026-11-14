import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/newva/AppData/Local/npm-cache/_npx/af752b90495482d7/node_modules/playwright-core');
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('brag-output-10s/composition/assets/images/walkthrough');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const iphone = devices['iPhone 14 Pro'];
  const context = await browser.newContext({
    ...iphone,
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2
  });

  // Pre-seed localStorage with authenticated state & site unlock
  await context.addInitScript(() => {
    localStorage.setItem('bigsuu_site_token', 'verified_7865');
    sessionStorage.setItem('bigsuu_site_token', 'verified_7865');
    localStorage.setItem('bigsuu_auth_token', 'token_bigsuu_vip');
    sessionStorage.setItem('bigsuu_auth_token', 'token_bigsuu_vip');
    localStorage.setItem('bigsuu_auth_user', JSON.stringify({
      id: 'user_bigsuu_vip',
      username: 'bigsuu',
      displayName: 'Big Suu',
      email: 'sandhu.suhail@gmail.com',
      role: 'vip',
      isVip: true,
      membership: 'vip'
    }));
    localStorage.setItem('bss_theme_mode', 'dark');
  });

  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. NBA Schedule Home
  console.log('Capturing step1-nba-home.png...');
  await page.screenshot({ path: path.join(outDir, 'step1-nba-home.png') });

  // 2. Scrolling down on NBA Schedule
  console.log('Scrolling down NBA schedule...');
  await page.evaluate(() => window.scrollBy({ top: 380, behavior: 'instant' }));
  await page.waitForTimeout(600);
  console.log('Capturing step2-nba-scrolled.png...');
  await page.screenshot({ path: path.join(outDir, 'step2-nba-scrolled.png') });

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  // 3. Switch between NBA and NFL
  console.log('Switching to NFL...');
  const switchBtn = page.locator('button[title*="Switch to"], button[aria-label="Switch Sport"]').first();
  if (await switchBtn.count() > 0) {
    await switchBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing step3-nfl-home.png...');
    await page.screenshot({ path: path.join(outDir, 'step3-nfl-home.png') });
  }

  // 4. Click into Game Card to open Live Player
  console.log('Opening game card for Live Player...');
  await page.evaluate(() => {
    // Click the first game card container
    const card = document.querySelector('main div[class*="group cursor-pointer"], main div[class*="border-gray"]');
    if (card) {
      card.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    }
  });

  await page.waitForTimeout(2000);
  console.log('Capturing step4-live-player.png...');
  await page.screenshot({ path: path.join(outDir, 'step4-live-player.png') });

  // Also scroll down a bit inside live player to see stream stats, box scores, leader stats
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'instant' }));
  await page.waitForTimeout(600);
  console.log('Capturing step4b-live-stats.png...');
  await page.screenshot({ path: path.join(outDir, 'step4b-live-stats.png') });

  // 5. Open Settings Modal (navigate back to home, then open profile)
  console.log('Opening Settings Modal...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Click profile button in top right
  const profileBtn = page.locator('button:has-text("VIP Member"), button[title*="Account"]').first();
  if (await profileBtn.count() > 0) {
    await profileBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing step5-settings-modal.png...');
    await page.screenshot({ path: path.join(outDir, 'step5-settings-modal.png') });

    // Scroll within settings modal to show streaming preferences
    await page.evaluate(() => {
      const modal = document.querySelector('div[class*="overflow-y-auto"]');
      if (modal) modal.scrollBy({ top: 300, behavior: 'instant' });
    });
    await page.waitForTimeout(500);
    console.log('Capturing step5b-settings-stream-options.png...');
    await page.screenshot({ path: path.join(outDir, 'step5b-settings-stream-options.png') });
  }

  await browser.close();
  console.log('All walkthrough features captured successfully!');
}

run().catch(err => {
  console.error('Error running capture:', err);
  process.exit(1);
});
