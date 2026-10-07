// The release page as one tall plate, with the lazily-loaded Assets list
// actually loaded (it only fetches once scrolled into view), plus the zip link's
// position for the pointer. SCHEME=light captures the second film's plate
// (release-full-day.png / release-day.json).
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, VIDEO } from './lib.mjs';
const OUT = path.join(VIDEO, 'public', 'github');
const SCHEME = process.env.SCHEME === 'light' ? 'light' : 'dark';
const SUFFIX = SCHEME === 'light' ? '-day' : '';
const browser = await launch(['--lang=en-US']);
try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1440, height: 810, deviceScaleFactor: 3 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: SCHEME }]);
  await page.goto('https://github.com/priyank1205/youtube-timestamped-summary/releases/latest', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(2500);
  await page.evaluate(() => {
    const d = Array.from(document.querySelectorAll('details')).find((el) => /Assets/.test(el.querySelector('summary')?.textContent || ''));
    if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); }
  });
  await page.waitForFunction(() => /Source code/.test(document.body.innerText), { timeout: 30000 });
  await sleep(1200);
  const info = await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find((el) => /timestamped-summary-for-youtube-v[\d.]+\.zip/.test(el.textContent || ''));
    const r = a.getBoundingClientRect();
    return { zip: { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }, text: a.textContent.trim(), docH: document.documentElement.scrollHeight };
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
  await page.screenshot({ path: path.join(OUT, `release-full${SUFFIX}.png`), fullPage: true });
  fs.writeFileSync(path.join(OUT, `release${SUFFIX}.json`), JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info));
} finally { await browser.close(); }
