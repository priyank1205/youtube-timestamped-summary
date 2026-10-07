// Drives the REAL options page (settings + first-run setup) through every state
// the video shows, and saves a self-contained DOM+CSS snapshot of each, plus a
// QA screenshot and the positions of whatever the cursor will click.
import fs from 'node:fs';
import path from 'node:path';
import { serveRepo, launch, optionsStub, POPULATED, sleep, VIDEO } from './lib.mjs';
import { SNAPSHOT_FN } from './snapshot.mjs';

const OUT = path.join(VIDEO, 'public', 'snapshots');
const QA = path.join(VIDEO, '.cache', 'qa');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(QA, { recursive: true });
const W = 1440, H = 810;
// Key-shaped, but one character short of a real Google key's format, so no
// secret scanner mistakes the film's assets for a leaked credential.
const DEMO_KEY = 'AIzaSyC4mPq8LrT2vXn7Wd9eKb3hJs6Yf0uZa';

const server = await serveRepo(8771);
const browser = await launch();

async function snap(page, name, measure = {}) {
  await sleep(1100); // let entrance animations finish so the snapshot is the settled state
  const data = await page.evaluate(`(${SNAPSHOT_FN})(${JSON.stringify({ measure })})`);
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(data));
  await page.screenshot({ path: path.join(QA, `${name}.png`) });
  console.log(name, 'html', (data.html.length / 1024).toFixed(0) + 'KB', 'css', (data.css.length / 1024).toFixed(0) + 'KB', JSON.stringify(data.geo));
  return data;
}

async function newPage(store) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 3 });
  page.on('pageerror', (e) => console.log('pageerror:', e.message));
  await page.evaluateOnNewDocument(optionsStub(store));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  return page;
}

const click = (page, q) => page.evaluate((q) => { const el = document.querySelector(q); if (el) el.click(); return !!el; }, q);

try {
  // ---------------------------------------------------------------- settings
  const SETTINGS_MEASURE = {
    navSummaries: '.nav-item[data-pane="summaries"]', navAi: '.nav-item[data-pane="ai"]', navStats: '.nav-item[data-pane="stats"]',
    themeAuto: '#theme-options [data-value="system"], #theme-options > :nth-child(1)',
    themeLight: '#theme-options [data-value="light"], #theme-options > :nth-child(2)',
    themeDark: '#theme-options [data-value="dark"], #theme-options > :nth-child(3)',
    detailBrief: '#detail-options > :nth-child(1)', detailStandard: '#detail-options > :nth-child(2)', detailInDepth: '#detail-options > :nth-child(3)',
    designRefined: '#skin-options > :nth-child(1)', designOriginal: '#skin-options > :nth-child(2)',
    preview: '#preview-summaries', providers: '#providers-list', selector: '#model-selector-btn',
    statCanvas: '#stat-canvas, .stat-bloom img, .stat-bloom', statNum: '#stat-summaries', statSaved: '#stat-time-saved',
  };
  const s = await newPage(POPULATED);
  await s.goto('http://localhost:8771/options/options.html#settings', { waitUntil: 'networkidle0' });
  await sleep(800);
  await snap(s, 'settings-summaries', SETTINGS_MEASURE);
  await click(s, '#theme-options > :nth-child(2)');
  await snap(s, 'settings-summaries-light', SETTINGS_MEASURE);
  await click(s, '#theme-options > :nth-child(3)');
  await snap(s, 'settings-summaries-dark-again', SETTINGS_MEASURE);
  await click(s, '.nav-item[data-pane="ai"]');
  await snap(s, 'settings-ai', SETTINGS_MEASURE);
  await click(s, '.nav-item[data-pane="stats"]');
  await snap(s, 'settings-stats', SETTINGS_MEASURE);
  await s.close();

  // ------------------------------------------------------------------- setup
  const SETUP_MEASURE = {
    choiceFree: '.su-choice[data-choice="gemini"]', choiceOwn: '.su-choice[data-choice="existing"]',
    keyInput: '#su-key', connect: '#su-connect', openStudio: '#su-open-studio', title: '.setup-screen.active .setup-h',
    card: '.setup-card', doneTitle: '#su-done-title', gotoYouTube: '#su-goto-youtube', tick: '.su-3 .su-tick',
  };
  const u = await newPage({ THEME_PREF: 'dark', PANEL_SKIN: 'quiet', SUMMARY_LENGTH: 'standard' });
  await u.goto('http://localhost:8771/options/options.html#setup', { waitUntil: 'networkidle0' });
  await sleep(600);
  await snap(u, 'setup-1', SETUP_MEASURE);
  await click(u, '.su-choice[data-choice="gemini"]');
  await snap(u, 'setup-2', SETUP_MEASURE);
  // Type a key the way a paste lands: all at once, then the input event.
  await u.evaluate((key) => {
    const k = document.getElementById('su-key');
    k.focus();
    k.value = key;
    k.dispatchEvent(new Event('input', { bubbles: true }));
  }, DEMO_KEY);
  await snap(u, 'setup-2-typed', SETUP_MEASURE);
  await u.evaluate(() => { window.__fetchMode = 'pending'; document.getElementById('su-connect').click(); });
  await snap(u, 'setup-2-checking', SETUP_MEASURE);
  await u.close();

  // The finished screen, reached by a real Connect that the stub approves.
  const d = await newPage({ THEME_PREF: 'dark', PANEL_SKIN: 'quiet', SUMMARY_LENGTH: 'standard' });
  await d.goto('http://localhost:8771/options/options.html#setup', { waitUntil: 'networkidle0' });
  await sleep(500);
  await click(d, '.su-choice[data-choice="gemini"]');
  await sleep(500);
  await d.evaluate((key) => {
    const k = document.getElementById('su-key');
    k.value = key;
    k.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('su-connect').click();
  }, DEMO_KEY);
  // Snapshot early, before the confetti settles, so its pieces are in the DOM.
  await sleep(250);
  const data = await d.evaluate(`(${SNAPSHOT_FN})(${JSON.stringify({ measure: SETUP_MEASURE })})`);
  fs.writeFileSync(path.join(OUT, 'setup-3.json'), JSON.stringify(data));
  await sleep(2200);
  await d.screenshot({ path: path.join(QA, 'setup-3.png') });
  console.log('setup-3', JSON.stringify(data.geo), 'confetti pieces:', (data.html.match(/<i[^>]*su-confetti|class="dot"/g) || []).length);
  await d.close();
} finally {
  await browser.close();
  server.close();
}
