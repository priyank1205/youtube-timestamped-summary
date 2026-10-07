// First look: render the real options page in each pane and the setup guide,
// and screenshot them, to decide how the video reproduces them.
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launch, optionsStub, POPULATED, sleep, VIDEO } from './lib.mjs';

const OUT = path.join(VIDEO, '.cache', 'explore');
fs.mkdirSync(OUT, { recursive: true });

const W = Number(process.env.W || 1440);
const H = Number(process.env.H || 810);

const server = await serveRepo(8771);
const browser = await launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.evaluateOnNewDocument(optionsStub(POPULATED));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

  await page.goto('http://localhost:8771/options/options.html#settings', { waitUntil: 'networkidle0' });
  await sleep(1200);
  for (const pane of ['summaries', 'ai', 'stats', 'about']) {
    await page.evaluate((p) => document.querySelector(`.nav-item[data-pane="${p}"]`)?.click(), pane);
    await sleep(900);
    await page.screenshot({ path: path.join(OUT, `options-${pane}-${W}.png`) });
    const dims = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight }));
    console.log(pane, dims);
  }

  // The setup guide, as a first-run user sees it.
  const setup = await browser.newPage();
  await setup.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  setup.on('pageerror', (e) => console.log('pageerror:', e.message));
  await setup.evaluateOnNewDocument(optionsStub({ THEME_PREF: 'dark', PANEL_SKIN: 'quiet' }));
  await setup.goto('http://localhost:8771/options/options.html', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await setup.screenshot({ path: path.join(OUT, `setup-1-${W}.png`) });
} finally {
  await browser.close();
  server.close();
}
