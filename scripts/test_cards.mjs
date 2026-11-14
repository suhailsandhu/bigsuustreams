import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('C:/Users/newva/AppData/Local/npm-cache/_npx/af752b90495482d7/node_modules/playwright-core');

async function test() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const context = await browser.newContext(devices['iPhone 14 Pro']);
  await context.addInitScript(() => {
    localStorage.setItem('bigsuu_site_token', 'verified_7865');
    sessionStorage.setItem('bigsuu_site_token', 'verified_7865');
    localStorage.setItem('bigsuu_auth_token', 'token_bigsuu_vip');
  });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);

  // Find game card
  const card = page.locator('main [class*="cursor-pointer"]').first();
  console.log('Card text:', await card.innerText());
  await card.click();
  await page.waitForTimeout(1500);

  console.log('After click, text snippet:', (await page.locator('body').innerText()).slice(0, 300).replace(/\n/g, ' '));
  await page.screenshot({ path: 'brag-output-10s/composition/assets/images/walkthrough/test_player.png' });
  await browser.close();
}

test();
