// Read Chrome's own browser-chrome colour pipeline (the colours WebUI receives
// as CSS variables) for the dark theme, to paint the browser frame accurately.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer-core';
import { CFT, VIDEO, sleep } from './lib.mjs';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-profile-'));
const browser = await puppeteer.launch({ executablePath: CFT, headless: 'new', args: [`--user-data-dir=${profile}`, '--force-dark-mode'], defaultViewport: null });
try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto('chrome://theme/colors.css?sets=ui,chrome', { waitUntil: 'load' });
  const css = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(VIDEO, '.cache', 'chrome-colors.css'), css);
  const want = /--color-(frame-active|toolbar|toolbar-button-icon|toolbar-text|omnibox-background|omnibox-text|omnibox-text-dimmed|omnibox-results-background|tab-background-active-frame-active|tab-background-inactive-frame-active|tab-foreground-active-frame-active|tab-foreground-inactive-frame-active|tab-divider-frame-active|toolbar-separator|toolbar-top-separator-frame-active|tab-stroke-frame-active|new-tab-button-foreground-frame-active|location-bar-border|omnibox-icon|bookmark-bar-background|downloads|toolbar-ink-drop|tab-close-button)[a-z-]*:/;
  console.log(css.split(/;\s*/).filter((l) => want.test(l.trim())).join('\n'));
  console.log('total length', css.length);
} finally { await browser.close(); }
