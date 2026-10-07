// Reference capture of YouTube's real watch page (dark theme): screenshots plus
// measured geometry, computed type and the inline SVG icons, so the video's
// YouTube page is built from measurements rather than memory. Nothing from the
// video being watched (its frames, title, thumbnails) is reused.
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, VIDEO } from './lib.mjs';

const OUT = path.join(VIDEO, '.cache', 'youtube');
fs.mkdirSync(OUT, { recursive: true });
const URL = process.env.YT_URL || 'https://www.youtube.com/watch?v=zjkBMFhNj_g';
const W = Number(process.env.W || 1440), H = Number(process.env.H || 810);

const browser = await launch(['--lang=en-US']);
try {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);

  // Sit out any pre-roll: skip when offered, otherwise wait for it to end.
  for (let i = 0; i < 90; i++) {
    const ad = await page.evaluate(() => {
      const p = document.querySelector('#movie_player');
      const skip = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern');
      if (skip) skip.click();
      return !!(p && p.classList.contains('ad-showing'));
    });
    if (!ad) break;
    await sleep(1000);
  }
  // Seek well into the video so the progress bar shows a played segment, then pause.
  await page.evaluate(() => {
    document.documentElement.setAttribute('dark', '');
    const v = document.querySelector('video');
    if (v) { v.currentTime = Math.min(1500, (v.duration || 3000) * 0.4); v.pause(); }
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, `watch-${W}.png`) });

  const pr = await page.evaluate(() => { const r = document.querySelector('#movie_player')?.getBoundingClientRect(); return r && { x: r.x, y: r.y, w: r.width, h: r.height }; });
  if (pr) {
    await page.mouse.move(pr.x + pr.w * 0.5, pr.y + pr.h * 0.5);
    await sleep(500);
    await page.mouse.move(pr.x + pr.w * 0.55, pr.y + pr.h * 0.55);
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, `watch-controls-${W}.png`) });
    const pb = await page.evaluate(() => { const r = document.querySelector('.ytp-progress-bar')?.getBoundingClientRect(); return r && { x: r.x, y: r.y, w: r.width, h: r.height }; });
    if (pb) {
      await page.mouse.move(pb.x + pb.w * 0.62, pb.y + pb.h / 2, { steps: 4 });
      await sleep(900);
      await page.screenshot({ path: path.join(OUT, `watch-scrub-${W}.png`) });
      fs.writeFileSync(path.join(OUT, `scrub-html-${W}.html`), await page.evaluate(() => document.querySelector('.ytp-tooltip')?.outerHTML || ''));
    }
    await page.mouse.move(pr.x + pr.w * 0.55, pr.y + pr.h * 0.55);
    await sleep(300);
  }

  const info = await page.evaluate(() => {
    const cut = (s, n) => (typeof s === 'string' ? s.slice(0, n) : null);
    const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const style = (el, props) => { if (!el) return null; const cs = getComputedStyle(el); const o = {}; for (const p of props) o[p] = cs.getPropertyValue(p); return o; };
    const T = ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'letter-spacing'];
    const B = ['background-color', 'border-radius', 'padding', 'height', 'color', 'font-size', 'font-weight', 'font-family', 'border'];
    const q = (s) => document.querySelector(s);
    const svgOf = (el) => (el ? (el.querySelector('svg')?.outerHTML || null) : null);
    const text = (el) => (el && typeof el.innerText === 'string' ? el.innerText.trim() : null);
    const out = {};
    out.viewport = { w: innerWidth, h: innerHeight };
    out.htmlDark = document.documentElement.hasAttribute('dark');
    out.bodyBg = getComputedStyle(document.body).backgroundColor;
    const vars = {};
    const cs = getComputedStyle(document.documentElement);
    for (const v of ['--yt-spec-base-background', '--yt-spec-text-primary', '--yt-spec-text-secondary', '--yt-spec-badge-chip-background', '--yt-spec-10-percent-layer', '--yt-spec-static-brand-red', '--yt-spec-call-to-action', '--yt-spec-menu-background', '--yt-spec-raised-background', '--yt-spec-general-background-a', '--yt-spec-outline', '--yt-spec-icon-inactive', '--yt-spec-additive-background', '--yt-spec-static-overlay-background-heavy', '--yt-spec-touch-response', '--yt-spec-mono-filled-hover']) vars[v] = cs.getPropertyValue(v).trim();
    out.vars = vars;
    out.masthead = rect(q('#masthead-container'));
    out.mastheadStyle = style(q('#masthead-container #container') || q('#masthead'), ['background-color', 'height', 'padding']);
    out.logo = { rect: rect(q('ytd-topbar-logo-renderer #logo-icon')), svg: svgOf(q('ytd-topbar-logo-renderer #logo-icon')), country: text(q('#country-code')) };
    out.guideBtn = { rect: rect(q('#guide-button')), svg: svgOf(q('#guide-button')) };
    const sb = q('yt-searchbox') || q('ytd-searchbox');
    out.searchBox = { rect: rect(sb), html: cut(sb?.outerHTML, 8000) };
    out.searchInput = { rect: rect(q('yt-searchbox input, ytd-searchbox input')), style: style(q('yt-searchbox input, ytd-searchbox input'), T) };
    out.searchBoxStyle = style(q('.ytSearchboxComponentInputBox, #container.ytd-searchbox'), ['border', 'border-radius', 'background-color', 'height', 'padding']);
    const sbtn = q('.ytSearchboxComponentSearchButton, #search-icon-legacy');
    out.searchBtn = { rect: rect(sbtn), style: style(sbtn, ['background-color', 'border', 'border-radius', 'width', 'height']), svg: svgOf(sbtn) };
    out.voiceBtn = { rect: rect(q('#voice-search-button')), svg: svgOf(q('#voice-search-button')), style: style(q('#voice-search-button button'), B) };
    out.endButtons = Array.from(document.querySelectorAll('#end #buttons > *')).map((el) => ({ tag: el.tagName, rect: rect(el), text: cut(text(el), 40), svg: svgOf(el), style: style(el.querySelector('button, a') || el, B) }));
    out.player = rect(q('#movie_player'));
    out.playerStyle = style(q('#movie_player'), ['border-radius', 'background-color']);
    out.playerContainerStyle = style(q('#player-container-inner, #player-container-outer, #ytd-player'), ['border-radius']);
    out.primary = rect(q('#primary'));
    out.secondary = rect(q('#secondary'));
    out.secondaryInner = rect(q('#secondary-inner'));
    out.title = { rect: rect(q('#title h1')), style: style(q('#title h1 yt-formatted-string') || q('#title h1'), T) };
    out.owner = {
      rect: rect(q('#owner')), avatar: rect(q('#owner #avatar')), channel: style(q('#owner #channel-name a') || q('#owner ytd-channel-name'), T),
      channelRect: rect(q('#owner ytd-channel-name')), subs: style(q('#owner-sub-count'), T), subsRect: rect(q('#owner-sub-count')),
      verified: svgOf(q('#owner ytd-badge-supported-renderer')),
    };
    out.subscribe = { rect: rect(q('#subscribe-button button')), style: style(q('#subscribe-button button'), B), text: text(q('#subscribe-button button')) };
    out.actionsRect = rect(q('#actions'));
    out.actionButtons = Array.from(document.querySelectorAll('#actions button')).slice(0, 14).map((b) => ({ rect: rect(b), text: text(b), aria: b.getAttribute('aria-label'), svg: svgOf(b), style: style(b, B) }));
    out.description = { rect: rect(q('#description')), style: style(q('#description'), ['background-color', 'border-radius', 'padding']), info: style(q('#info-container yt-formatted-string, #info span'), T), infoRect: rect(q('#info-container')), text: cut(text(q('#description')), 400), body: style(q('#description-inline-expander yt-attributed-string, #description-inline-expander'), T) };
    const chipEls = Array.from(document.querySelectorAll('#secondary chip-shape, #secondary yt-chip-cloud-chip-renderer'));
    out.chips = { list: chipEls.slice(0, 8).map((c) => ({ rect: rect(c), text: text(c), style: style(c.querySelector('button, div') || c, B) })) };
    const lockups = Array.from(document.querySelectorAll('#secondary yt-lockup-view-model, #secondary ytd-compact-video-renderer'));
    const firstRel = lockups[0];
    out.related = {
      rect: rect(firstRel), html: cut(firstRel?.outerHTML, 12000), thumb: rect(firstRel?.querySelector('yt-thumbnail-view-model, img')),
      title: style(firstRel?.querySelector('h3 span, h3, #video-title'), T), titleRect: rect(firstRel?.querySelector('h3')),
      meta: style(firstRel?.querySelector('.yt-content-metadata-view-model__metadata-text, .yt-content-metadata-view-model-wiz__metadata-text, #metadata-line span'), T),
      badge: style(firstRel?.querySelector('.yt-badge-shape, .badge-shape-wiz, ytd-thumbnail-overlay-time-status-renderer'), B),
    };
    out.relatedRects = lockups.slice(0, 8).map(rect);
    out.controls = {
      bottom: rect(q('.ytp-chrome-bottom')),
      progressContainer: rect(q('.ytp-progress-bar-container')),
      progressBar: rect(q('.ytp-progress-bar')),
      play: style(q('.ytp-play-progress'), ['background', 'background-color', 'background-image', 'height', 'transform', 'border-radius']),
      playRect: rect(q('.ytp-play-progress')),
      load: style(q('.ytp-load-progress'), ['background', 'background-color', 'border-radius']),
      list: style(q('.ytp-progress-list'), ['background', 'background-color', 'height', 'border-radius']),
      scrubber: { rect: rect(q('.ytp-scrubber-button')), style: style(q('.ytp-scrubber-button'), ['background', 'background-color', 'width', 'height', 'border-radius']) },
      time: { rect: rect(q('.ytp-time-display')), style: style(q('.ytp-time-display'), T), text: text(q('.ytp-time-display')) },
      buttons: Array.from(document.querySelectorAll('.ytp-chrome-controls button, .ytp-chrome-controls .ytp-button')).map((b) => ({ cls: b.className, aria: b.getAttribute('aria-label') || b.getAttribute('data-title-no-tooltip') || b.title, rect: rect(b), svg: cut(b.querySelector('svg')?.outerHTML, 4000) })),
      gradient: style(q('.ytp-gradient-bottom'), ['background-image', 'height', 'background']),
      chromeHtml: cut(q('.ytp-chrome-bottom')?.outerHTML, 60000),
    };
    return out;
  });
  fs.writeFileSync(path.join(OUT, `reference-${W}.json`), JSON.stringify(info, null, 2));
  console.log('saved; dark =', info.htmlDark, 'player', JSON.stringify(info.player), 'secondary', JSON.stringify(info.secondary));
} finally {
  await browser.close();
}
