// Second reference pass: the player while PLAYING (pause glyph, live time) and a
// verified channel's badge, plus the signed-out masthead's icon set.
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, VIDEO } from './lib.mjs';
const OUT = path.join(VIDEO, '.cache', 'youtube');
const browser = await launch(['--lang=en-US', '--autoplay-policy=no-user-gesture-required', '--mute-audio']);
try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 810, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  // A verified channel's long talk.
  await page.goto('https://www.youtube.com/watch?v=aircAruvnKk', { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);
  for (let i = 0; i < 90; i++) {
    const ad = await page.evaluate(() => { const p = document.querySelector('#movie_player'); const s = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern'); if (s) s.click(); return !!(p && p.classList.contains('ad-showing')); });
    if (!ad) break; await sleep(1000);
  }
  await page.evaluate(() => { const v = document.querySelector('video'); if (v) { v.muted = true; v.currentTime = 300; v.play(); } });
  await sleep(1500);
  const pr = await page.evaluate(() => { const r = document.querySelector('#movie_player').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.mouse.move(pr.x + pr.w * 0.5, pr.y + pr.h * 0.5);
  await sleep(400);
  await page.mouse.move(pr.x + pr.w * 0.52, pr.y + pr.h * 0.52);
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, 'playing-controls.png') });
  const info = await page.evaluate(() => {
    const svg = (q) => document.querySelector(q)?.querySelector('svg')?.outerHTML || null;
    return {
      pause: svg('.ytp-play-button'),
      verified: svg('#owner ytd-badge-supported-renderer, #owner .badge, #channel-name ytd-badge-supported-renderer'),
      time: document.querySelector('.ytp-time-display')?.innerText,
      autonav: document.querySelector('.ytp-autonav-toggle')?.outerHTML.slice(0, 3000),
      settingsBadge: document.querySelector('.ytp-settings-button')?.outerHTML.slice(0, 600),
      actions: Array.from(document.querySelectorAll('#actions button')).slice(0, 10).map((b) => ({ aria: b.getAttribute('aria-label'), text: b.innerText.trim(), svg: b.querySelector('svg')?.outerHTML || null })),
      timeHtml: document.querySelector('.ytp-time-display')?.outerHTML.slice(0, 1500),
    };
  });
  fs.writeFileSync(path.join(OUT, 'playing.json'), JSON.stringify(info, null, 2));
  console.log('pause svg?', !!info.pause, 'verified?', !!info.verified, 'time', info.time);
} finally { await browser.close(); }
