// Real chrome://extensions in Chrome for Testing, dark theme, in the three states
// the install scene walks through: Developer mode off, on, and with this
// extension loaded. Throwaway profile; nothing of the user's is touched.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer-core';
import { CFT, REPO, VIDEO, sleep } from './lib.mjs';

const OUT = path.join(VIDEO, 'public', 'chrome');
fs.mkdirSync(OUT, { recursive: true });
const W = 1440, H = 810, DSF = 3;

async function open(withExtension) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-profile-'));
  const args = ['--hide-scrollbars', '--lang=en-US', `--user-data-dir=${profile}`, '--force-dark-mode', '--enable-features=WebUIDarkMode'];
  if (withExtension) args.push(`--disable-extensions-except=${REPO}`, `--load-extension=${REPO}`);
  const browser = await puppeteer.launch({ executablePath: CFT, headless: 'new', args, defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: DSF });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto('chrome://extensions', { waitUntil: 'load' });
  await sleep(1500);
  return { browser, page };
}

// Clicking an empty spot drops the focus ring Chrome puts on the search field.
const blur = async (page) => { await page.mouse.click(1000, 700); await sleep(300); };
const devToggle = (page, on) => page.evaluate((on) => {
  const mgr = document.querySelector('extensions-manager');
  const toolbar = mgr.shadowRoot.querySelector('extensions-toolbar');
  const toggle = toolbar.shadowRoot.querySelector('#devMode');
  if (toggle && toggle.checked !== on) toggle.click();
  return !!toggle;
}, on);

{
  const { browser, page } = await open(false);
  await devToggle(page, false); await sleep(600); await blur(page);
  await page.screenshot({ path: path.join(OUT, 'ext-devoff.png') });
  await devToggle(page, true); await sleep(900); await blur(page);
  await page.screenshot({ path: path.join(OUT, 'ext-devon.png') });
  await browser.close();
}
{
  const { browser, page } = await open(true);
  await devToggle(page, true); await sleep(1200);
  // Close whatever the extension opened on install, keep the extensions tab.
  for (const p of await browser.pages()) if (p !== page) await p.close().catch(() => {});
  await page.bringToFront();
  await sleep(600); await blur(page);
  await page.screenshot({ path: path.join(OUT, 'ext-loaded.png') });
  const geo = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    const mgr = document.querySelector('extensions-manager');
    const tb = mgr.shadowRoot.querySelector('extensions-toolbar');
    const devMode = tb.shadowRoot.querySelector('#devMode');
    const loadUnpacked = tb.shadowRoot.querySelector('#loadUnpacked');
    const list = mgr.shadowRoot.querySelector('extensions-item-list');
    const item = list?.shadowRoot.querySelector('extensions-item');
    return { devMode: r(devMode), loadUnpacked: r(loadUnpacked), item: r(item), itemName: item?.shadowRoot?.querySelector('#name')?.textContent };
  });
  fs.writeFileSync(path.join(OUT, 'layout.json'), JSON.stringify({ W, H, DSF, ...geo }, null, 2));
  console.log(JSON.stringify(geo));
  await browser.close();
}
