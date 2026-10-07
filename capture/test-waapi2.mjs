import puppeteer from 'puppeteer-core';
import os from 'node:os';
import path from 'node:path';
import { CFT } from './lib.mjs';
const SHELL = path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');
for (const [label, exe, headless] of [['cft-new', CFT, 'new'], ['shell', SHELL, 'shell']]) {
  const browser = await puppeteer.launch({ executablePath: exe, headless });
  const page = await browser.newPage();
  await page.setViewport({ width: 300, height: 120 });
  await page.setContent(`<body style="margin:0;background:#000"><style>@keyframes fi{from{opacity:0}to{opacity:1}}
  .a{width:100px;height:100px;background:#f00;animation:fi 10s linear both}</style><div id=x class=a></div></body>`);
  // Drive to the end immediately, then screenshot.
  await page.evaluate(() => { for (const a of document.getElementById('x').getAnimations()) { a.pause(); a.currentTime = 100000; } });
  const buf = await page.screenshot({ clip: { x: 50, y: 50, width: 1, height: 1 }, encoding: 'base64' });
  // decode one pixel via an offscreen canvas in page
  const px = await page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = 1; c.height = 1; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return Array.from(g.getImageData(0, 0, 1, 1).data); }, buf);
  console.log(label, 'pixel after driving to end (expect red 255):', px.join(','));
  await browser.close();
}
