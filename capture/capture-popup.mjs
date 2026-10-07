// The toolbar popup in its "Ready" state, as a snapshot.
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launch, optionsStub, POPULATED, sleep, VIDEO } from './lib.mjs';
import { SNAPSHOT_FN } from './snapshot.mjs';
const OUT = path.join(VIDEO, 'public', 'snapshots');
const server = await serveRepo(8772);
const browser = await launch();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 300, deviceScaleFactor: 3 });
  await page.evaluateOnNewDocument(optionsStub(POPULATED));
  await page.goto('http://localhost:8772/popup/popup.html', { waitUntil: 'networkidle0' });
  await sleep(600);
  const h = await page.evaluate(() => document.body.getBoundingClientRect().height);
  await page.setViewport({ width: 320, height: Math.ceil(h), deviceScaleFactor: 3 });
  await sleep(300);
  const data = await page.evaluate(`(${SNAPSHOT_FN})(${JSON.stringify({ measure: { openSettings: '#open-settings', detail: '#detail' } })})`);
  fs.writeFileSync(path.join(OUT, 'popup.json'), JSON.stringify(data));
  await page.screenshot({ path: path.join(VIDEO, '.cache', 'qa', 'popup.png') });
  console.log('popup height', h, JSON.stringify(data.geo));
} finally { await browser.close(); server.close(); }
