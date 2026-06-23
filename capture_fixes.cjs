const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', 'c9d226be-4432-4a47-b0fe-651e543867c4');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-web-security']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
  
  await wait(3000);
  
  // Settings dropdown
  await page.click('a[href="/settings"]');
  await wait(2000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'settings_dropdown_fix.png') });
  
  // Search for Shape of You
  await page.click('a[href="/search"]');
  await wait(1000);
  await page.type('input[placeholder="Search songs, albums, artists..."]', 'Shape of You');
  await page.keyboard.press('Enter');
  await wait(4000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'shape_of_you_search.png') });

  // Click on Ed Sheeran artist link in the search results
  console.log("Navigating to artist page...");
  const artistLinks = await page.$$('a[href^="/artist/"]');
  if (artistLinks.length > 0) {
    await artistLinks[0].click();
    await wait(4000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'artist_page_ed_sheeran.png') });
  }

  await browser.close();
}

run().catch(console.error);
