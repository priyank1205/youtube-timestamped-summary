// Spike 2: virtual time + ordinary screenshots (no BeginFrameControl on macOS).
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { VIDEO, CFT } from './lib.mjs';
const OUT = path.join(VIDEO, '.cache', 'spike2');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const html = `<!doctype html><html><body style="margin:0;background:#111;color:#fff;font:20px sans-serif">
<style>
@keyframes slide { from { transform: translateX(0) } to { transform: translateX(400px) } }
#a { width:50px;height:50px;background:red; animation: slide 1s linear both; }
#b { width:50px;height:50px;background:#09f; margin-top:10px; transition: margin-left 1s linear; margin-left:0 }
#b.go { margin-left: 400px }
</style>
<div id="a"></div><div id="b"></div><div id="t">t</div>
<script>
  const t0 = performance.now();
  setTimeout(() => document.getElementById('b').classList.add('go'), 500);
  function tick(){ document.getElementById('t').textContent = (performance.now()-t0).toFixed(0) + 'ms'; requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
</script></body></html>`;
const browser = await puppeteer.launch({ executablePath: CFT, headless: 'new', args: ['--hide-scrollbars'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 600, height: 200 });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  const step = async (ms) => {
    const done = new Promise((r) => cdp.once('Emulation.virtualTimeBudgetExpired', r));
    await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms });
    await done;
  };
  const nav = page.setContent(html);
  await step(10);
  await nav.catch(() => {});
  for (let i = 0; i < 40; i++) {
    await step(1000 / 30);
    // wall-clock jitter on purpose, to see whether frames depend on it
    await new Promise(r => setTimeout(r, Math.random() * 120));
    const info = await page.evaluate(() => ({
      a: getComputedStyle(document.getElementById('a')).transform,
      b: getComputedStyle(document.getElementById('b')).marginLeft,
      t: document.getElementById('t').textContent,
      now: performance.now().toFixed(1),
    }));
    console.log(i, JSON.stringify(info));
  }
} finally { await browser.close(); }
