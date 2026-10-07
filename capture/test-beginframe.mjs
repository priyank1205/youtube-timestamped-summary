// Spike: can chrome-headless-shell produce deterministic frames of a page with
// CSS animations, CSS transitions and setTimeout-driven state changes?
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer-core';
import { VIDEO } from './lib.mjs';

const SHELL = path.join(os.homedir(), '.cache/puppeteer/chrome-headless-shell/mac_arm-152.0.7977.54/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const OUT = path.join(VIDEO, '.cache', 'spike');
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

const browser = await puppeteer.launch({
  executablePath: SHELL,
  headless: 'shell',
  args: ['--deterministic-mode', '--enable-begin-frame-control', '--disable-new-content-rendering-timeout',
    '--run-all-compositor-stages-before-draw', '--disable-threaded-animation', '--disable-threaded-scrolling',
    '--disable-checker-imaging', '--disable-image-animation-resync', '--hide-scrollbars'],
});
try {
  const session = await browser.target().createCDPSession();
  const { targetId } = await session.send('Target.createTarget', { url: 'about:blank', enableBeginFrameControl: true, width: 600, height: 200 });
  const target = await browser.waitForTarget((t) => t._targetId === targetId || t._getTargetInfo?.().targetId === targetId);
  const page = await target.page();
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 600, height: 200, deviceScaleFactor: 1, mobile: false });

  // Virtual time: paused until we hand out budget frame by frame.
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  const nav = page.setContent(html);
  let frameTicks = 0;
  const step = async (ms) => {
    const done = new Promise((r) => cdp.once('Emulation.virtualTimeBudgetExpired', r));
    await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms });
    await done;
  };
  await step(16);
  await nav.catch(() => {});
  const interval = 1000 / 30;
  for (let i = 0; i < 40; i++) {
    await step(interval);
    frameTicks += interval;
    const res = await cdp.send('HeadlessExperimental.beginFrame', { interval, noDisplayUpdates: false, screenshot: { format: 'png' } });
    if (res.screenshotData) fs.writeFileSync(path.join(OUT, `f${String(i).padStart(3, '0')}.png`), Buffer.from(res.screenshotData, 'base64'));
    else console.log('no screenshot at', i, res.hasDamage);
  }
  console.log('done');
} finally {
  await browser.close();
}
