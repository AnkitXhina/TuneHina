const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 800 } });
  const page = await browser.newPage();
  
  // Wait for the dev server to be ready
  let ready = false;
  for (let i = 0; i < 10; i++) {
    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
      ready = true;
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!ready) {
    console.error('Failed to load http://localhost:5173');
    process.exit(1);
  }

  console.log('Capturing Home Page...');
  await new Promise(r => setTimeout(r, 2000)); // wait for sections to load
  await page.screenshot({ path: 'home_page_real.png' });

  // Play a song from Quick Picks or Trending
  console.log('Playing a song to open Now Playing...');
  await page.evaluate(() => {
    const playBtn = document.querySelector('.song-card');
    if (playBtn) playBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 3000)); // Wait for player to load and theme to apply

  // Open Now Playing
  await page.evaluate(() => {
    const miniPlayer = document.querySelector('.mini-player');
    if (miniPlayer) {
      miniPlayer.click();
    }
  });

  console.log('Capturing Now Playing (Up Next)...');
  await new Promise(r => setTimeout(r, 2000)); // wait for layout to settle and theme to extract
  await page.screenshot({ path: 'now_playing_upnext.png' });

  console.log('Switching to Lyrics tab...');
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('button');
    for (let t of tabs) {
      if (t.textContent.includes('LYRICS')) {
        t.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 2000)); // wait for lyrics to fetch
  await page.screenshot({ path: 'now_playing_lyrics.png' });

  console.log('Switching to Related tab...');
  await page.evaluate(() => {
    const tabs = document.querySelectorAll('button');
    for (let t of tabs) {
      if (t.textContent.includes('RELATED')) {
        t.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 2000)); // wait for related to fetch
  await page.screenshot({ path: 'now_playing_related.png' });

  console.log('Testing dynamic theme changes...');
  // Play the next song via transport control
  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (let b of btns) {
      if (b.getAttribute('aria-label') === 'Next') {
        b.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 4000)); // Wait for song load and theme extraction
  await page.screenshot({ path: 'theme_change_1.png' });

  await page.evaluate(() => {
    const btns = document.querySelectorAll('button');
    for (let b of btns) {
      if (b.getAttribute('aria-label') === 'Next') {
        b.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 4000)); // Wait for song load and theme extraction
  await page.screenshot({ path: 'theme_change_2.png' });

  await browser.close();
  console.log('All screenshots captured!');
})();
