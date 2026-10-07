import puppeteer from 'puppeteer-core';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
const SHELL = path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const browser = await puppeteer.launch({ executablePath: SHELL, headless: 'shell', args: ['--hide-scrollbars', '--allow-pre-commit-input', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 400, height: 500 });
await page.setContent(`<body style="margin:0;background:#000"><style>@keyframes fi{from{opacity:0}to{opacity:1}}
.fa{width:200px;height:200px;background:red;animation:fi 10s linear both}</style><div id=x class=fa></div>
<div id=s style="width:200px;height:200px;overflow:auto;margin-top:20px"><div style="height:300px;background:blue"></div><div style="height:300px;background:lime"></div></div></body>`);
await new Promise(r => setTimeout(r, 300));
await page.evaluate(() => { for (const a of document.getElementById('x').getAnimations()) { a.pause(); a.currentTime = 100000; } document.getElementById('s').scrollTop = 300; });
const client = page._client();
for (const [label, opts] of [['beyond+surface', { captureBeyondViewport: true, fromSurface: true, optimizeForSpeed: true }], ['plain', { captureBeyondViewport: false, fromSurface: true }]]) {
  const { data } = await client.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 400, height: 500, scale: 1 }, ...opts });
  fs.writeFileSync(`.cache/waapi-${label}.png`, Buffer.from(data, 'base64'));
}
await browser.close();
