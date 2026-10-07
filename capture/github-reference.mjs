// High-resolution captures of the project's real GitHub pages (dark theme), used
// directly as plates in the install scene. Logged out, as a visitor sees them.
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, VIDEO } from './lib.mjs';

const OUT = path.join(VIDEO, 'public', 'github');
fs.mkdirSync(OUT, { recursive: true });
const W = 1440, H = 810, DSF = 3;
const REPO = 'https://github.com/priyank1205/youtube-timestamped-summary';

const browser = await launch(['--lang=en-US']);
try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36');
  await page.setViewport({ width: W, height: H, deviceScaleFactor: DSF });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  // 1. Repository home, top of page.
  await page.goto(REPO, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, 'repo-top.png') });

  // 2. README hero, scrolled so the icon, title and tagline sit mid-frame.
  const readmeY = await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll('article h1, .markdown-body h1')).find((el) => /Timestamped Summary/.test(el.textContent));
    return h ? h.getBoundingClientRect().top + scrollY : 0;
  });
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 240)), readmeY);
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, 'repo-readme.png') });

  // 3. Latest release, Assets expanded.
  await page.goto(`${REPO}/releases/latest`, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(1500);
  const assets = await page.evaluate(() => {
    const d = Array.from(document.querySelectorAll('details')).find((el) => /Assets/.test(el.querySelector('summary')?.textContent || ''));
    if (d) d.open = true;
    return !!d;
  });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('a')).some((a) => /timestamped-summary-for-youtube-v[\d.]+\.zip$/.test(a.getAttribute('href') || '')), { timeout: 20000 }).catch(() => console.log('zip link not found'));
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, 'release-top.png') });
  // Whole page, so the scene can scroll it like a browser would.
  await page.screenshot({ path: path.join(OUT, 'release-full.png'), fullPage: true });
  const layout = await page.evaluate(() => {
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; };
    const summary = Array.from(document.querySelectorAll('details summary')).find((el) => /Assets/.test(el.textContent));
    const zip = Array.from(document.querySelectorAll('a')).find((a) => /timestamped-summary-for-youtube-v[\d.]+\.zip$/.test(a.getAttribute('href') || ''));
    return { assets: rect(summary), zip: rect(zip), zipText: zip?.textContent.trim(), zipHref: zip?.getAttribute('href'), docH: document.documentElement.scrollHeight };
  });
  console.log('assets found:', assets, JSON.stringify(layout));
  const scrollTo = layout.assets ? Math.max(0, layout.assets.y - 300) : 0;
  await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, 'release-assets.png') });
  // Hovered zip link (underline), same scroll.
  if (layout.zip) {
    await page.mouse.move(layout.zip.x + 40, layout.zip.y - scrollTo + layout.zip.h / 2);
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'release-assets-hover.png') });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(300);
    await page.screenshot({ path: path.join(OUT, 'release-full-hover.png'), fullPage: true });
  }
  fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify({ W, H, DSF, scrollTo, ...layout }, null, 2));
} finally {
  await browser.close();
}
