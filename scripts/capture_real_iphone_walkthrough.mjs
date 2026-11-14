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

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Capture NBA Schedule Screen (Dark Mode)
  console.log('Capturing 1-nba-home.png...');
  await page.screenshot({ path: path.join(outDir, '1-nba-home.png') });

  // 2. Scroll down on NBA Schedule
  console.log('Scrolling down NBA schedule...');
  await page.evaluate(() => window.scrollBy({ top: 320, behavior: 'instant' }));
  await page.waitForTimeout(600);
  console.log('Capturing 2-nba-scrolled.png...');
  await page.screenshot({ path: path.join(outDir, '2-nba-scrolled.png') });

  // Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  // 3. Switch to NFL
  console.log('Switching to NFL...');
  const switchBtn = page.locator('button[title*="Switch to NFL"], button[aria-label="Switch Sport"]').first();
  if (await switchBtn.count() > 0) {
    await switchBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 3-nfl-home.png...');
    await page.screenshot({ path: path.join(outDir, '3-nfl-home.png') });
  }

  // 4. Click into a Game Card to open Live Player
  console.log('Opening game card for Live Player...');
  // First switch back to NBA or click the first NFL game
  const gameCard = page.locator('main [class*="cursor-pointer"], main div[class*="rounded"]').first();
  // Let's find a clickable game card row
  const gameRows = page.locator('div[class*="group cursor-pointer"], div[class*="GameRow"], div[onClick]');
  const clicked = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div, button')).filter(el => {
      const txt = el.textContent || '';
      return (txt.includes('AWAY') && txt.includes('HOME')) || txt.includes('Raptors') || txt.includes('Commanders');
    });
    if (cards.length > 0) {
      // Find the clickable card container
      let target = cards[0];
      while (target && !target.getAttribute('class')?.includes('cursor-pointer') && target !== document.body) {
        target = target.parentElement;
      }
      if (target) {
        target.click();
        return true;
      }
    }
    return false;
  });

  await page.waitForTimeout(1500);
  console.log('Capturing 4-live-player.png...');
  await page.screenshot({ path: path.join(outDir, '4-live-player.png') });

  // 5. Open Settings / Profile Modal
  console.log('Opening Settings Modal...');
  // Navigate back home first if needed
  const homeBtn = page.locator('header img[alt="NBA"], header img[alt="NFL"]').first();
  if (await homeBtn.count() > 0) {
    await homeBtn.click();
    await page.waitForTimeout(600);
  }

  const profileBtn = page.locator('button[title*="Account & Settings"], button:has-text("VIP Member"), button:has-text("Membership")').first();
  if (await profileBtn.count() > 0) {
    await profileBtn.click();
    await page.waitForTimeout(800);
    console.log('Capturing 5-settings-modal.png...');
    await page.screenshot({ path: path.join(outDir, '5-settings-modal.png') });

    // Scroll down inside modal to show audio, quality, buffer options
    await page.evaluate(() => {
      const modal = document.querySelector('[class*="overflow-y-auto"]');
      if (modal) modal.scrollBy({ top: 250, behavior: 'instant' });
    });
    await page.waitForTimeout(500);
    console.log('Capturing 6-settings-options.png...');
    await page.screenshot({ path: path.join(outDir, '6-settings-options.png') });
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error running capture:', err);
  process.exit(1);
});
