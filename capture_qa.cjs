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
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  // Wait for home page to load
  await wait(3000);
  console.log("Navigating to settings...");
  // Go to Settings Page
  await page.click('a[href="/settings"]');
  await wait(2000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'settings_page_custom.png') });
  
  // Go back to Home
  console.log("Navigating to home...");
  await page.click('a[href="/"]');
  await wait(3000);

  // Take screenshot of Home page (checks for Unknown Artist fix)
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'home_page_qa.png') });

  // Click on a song to start playback and open Now Playing
  console.log("Starting playback...");
  const songs = await page.$$('.group.flex.cursor-pointer');
  if (songs.length > 0) {
    await songs[0].click();
    await wait(2000);
  }

  // Click mini player to open full player
  console.log("Opening full player...");
  await page.click('.fixed.bottom-0');
  await wait(3000);
  
  // Open 3-dot menu
  console.log("Opening 3-dot menu...");
  const moreBtn = await page.$$('button[aria-label="More options"]');
  if (moreBtn.length > 0) {
    await moreBtn[0].click();
    await wait(1000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'now_playing_menu.png') });
  }

  // Close menu by pressing Escape
  await page.keyboard.press('Escape');
  await wait(1000);

  // Navigate to Artist Page
  console.log("Navigating to artist page...");
  const artistLinks = await page.$$('a[href^="/artist/"]');
  if (artistLinks.length > 0) {
    await artistLinks[0].click();
    await wait(4000);
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'artist_page.png') });
  } else {
    console.log("No artist links found!");
  }

  await browser.close();
  console.log("QA Capture complete");
}

run().catch(console.error);
