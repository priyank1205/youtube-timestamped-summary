// Shared helpers for the capture scripts: a static server over the repo root and
// a Chrome for Testing launcher. Capture scripts render the extension's REAL
// pages (options page, panel harness) with stubbed chrome.* APIs, so the video
// can reuse their exact DOM, CSS and pixels instead of redrawing them by hand.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '..', '..');
export const VIDEO = path.resolve(here, '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

export function serveRepo(port = 8771) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let file = path.join(REPO, decodeURIComponent(url.pathname));
    if (!file.startsWith(REPO)) { res.writeHead(403); res.end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

export const CFT = path.join(os.homedir(),
  '.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');

export async function launch(extraArgs = []) {
  return puppeteer.launch({
    executablePath: CFT,
    headless: 'new',
    args: ['--hide-scrollbars', '--font-render-hinting=none', ...extraArgs],
    defaultViewport: null,
  });
}

// The chrome.* stub for the options page, seeded with a believable, populated
// profile. Every key here is fake; the page never touches the network.
export function optionsStub(store) {
  return `(() => {
    const store = ${JSON.stringify(store)};
    const clone = (v) => JSON.parse(JSON.stringify(v));
    window.__store = store;
    window.chrome = {
      runtime: {
        lastError: null, id: 'promo',
        getURL: (p) => '/' + String(p).replace(/^\\//, ''),
        getManifest: () => ({ version: '1.9.0', name: 'Timestamped Summary for YouTube' }),
        sendMessage: (m, cb) => { if (typeof cb === 'function') setTimeout(() => cb({ ok: true }), 0); },
        onMessage: { addListener() {} },
        openOptionsPage: () => {}
      },
      tabs: { create: () => {}, query: (q, cb) => cb && cb([]), update: () => {} },
      storage: {
        local: {
          get: (keys, cb) => {
            let out = {};
            if (keys === null || keys === undefined) out = clone(store);
            else if (typeof keys === 'string') { if (keys in store) out[keys] = clone(store[keys]); }
            else if (Array.isArray(keys)) keys.forEach((k) => { if (k in store) out[k] = clone(store[k]); });
            else Object.keys(keys).forEach((k) => { out[k] = (k in store) ? clone(store[k]) : keys[k]; });
            if (typeof cb === 'function') setTimeout(() => cb(out), 0);
            return Promise.resolve(out);
          },
          set: (obj, cb) => { Object.assign(store, clone(obj)); if (typeof cb === 'function') setTimeout(cb, 0); return Promise.resolve(); },
          remove: (keys, cb) => { [].concat(keys).forEach((k) => delete store[k]); if (typeof cb === 'function') setTimeout(cb, 0); return Promise.resolve(); },
          setAccessLevel: () => Promise.resolve()
        },
        onChanged: { addListener() {} }
      },
      permissions: {
        request: (o, cb) => cb && cb(true),
        remove: (o, cb) => cb && cb(true),
        contains: (o, cb) => cb && cb(true)
      }
    };
    const realFetch = window.fetch;
    // Gemini's model listing answers as a working free-tier key would; the mode
    // can be set to 'pending' to hold the page on its "Checking…" state.
    window.__fetchMode = 'ok';
    window.fetch = function (url) {
      const u = String(url);
      if (/generativelanguage\\.googleapis\\.com\\/v1beta\\/models\\?/.test(u)) {
        if (window.__fetchMode === 'pending') return new Promise(() => {});
        return Promise.resolve(new Response(JSON.stringify({ models: [
          { name: 'models/gemini-flash-lite-latest', displayName: 'Gemini Flash-Lite Latest', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/gemini-flash-latest', displayName: 'Gemini Flash Latest', supportedGenerationMethods: ['generateContent'] }
        ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      if (/^https?:\\/\\//.test(u) && !u.startsWith(location.origin)) return Promise.reject(new Error('offline'));
      return realFetch.apply(this, arguments);
    };
  })();`;
}

export const POPULATED = {
  GEMINI_API_KEY: 'demo-gemini-key-not-real-0000',
  gemini_MODEL: 'gemini-flash-lite-latest',
  ANTHROPIC_API_KEY: 'demo-anthropic-key-not-real-wXq7',
  anthropic_MODEL: 'claude-haiku-4-5-20251001',
  SELECTED_MODEL: 'auto',
  THEME_PREF: 'dark',
  PANEL_SKIN: 'quiet',
  SUMMARY_LENGTH: 'detailed',
  SUMMARIES_COUNT: 118,
  SECONDS_SAVED: 241920,
  POINTS_TOTAL: 2832,
  VIDEO_SECONDS_TOTAL: 83 * 3600 + 1200,
  READ_SECONDS_TOTAL: 15 * 3600 + 900,
  LONGEST_VIDEO_SECONDS: 3 * 3600 + 8 * 60,
  FIRST_SUMMARY_AT: Date.now() - 1000 * 60 * 60 * 24 * 61,
  COUNT_AT_FIRST: 0,
  gemini_CACHED_MODELS: [
    { id: 'gemini-flash-lite-latest', name: 'Gemini Flash-Lite Latest' },
    { id: 'gemini-flash-latest', name: 'Gemini Flash Latest' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' }
  ],
  anthropic_CACHED_MODELS: [
    { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
    { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' }
  ],
  SETUP_DONE: true
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
