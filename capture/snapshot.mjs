// In-page snapshot: serialises the live DOM of a page plus every CSS rule that
// applies at the current viewport into a self-contained bundle the video can
// mount inside a shadow root. Media queries are resolved here (kept only if they
// match), viewport units become pixels, and html/body/:root selectors are
// rewritten to wrapper classes so the page's own styles still land.
export const SNAPSHOT_FN = `async (opts) => {
  const W = innerWidth, H = innerHeight;
  const unit = (txt) => txt.replace(/(-?\\d*\\.?\\d+)(d|s|l)?(vh|vw|vmin|vmax)\\b/g, (m, n, _v, u) => {
    const v = parseFloat(n);
    const base = u === 'vh' ? H : u === 'vw' ? W : u === 'vmin' ? Math.min(W, H) : Math.max(W, H);
    return (v * base / 100).toFixed(3).replace(/\\.?0+$/, '') + 'px';
  });
  const sel = (s) => s
    .replace(/:root\\b/g, ':host')
    .replace(/(^|[\\s>+~,(])html(?=[\\s.#:\\[>+~,)]|$)/g, '$1.snap-html')
    .replace(/(^|[\\s>+~,(])body(?=[\\s.#:\\[>+~,)]|$)/g, '$1.snap-body');
  const out = [];
  const walk = (rules) => {
    for (const r of rules) {
      if (r instanceof CSSMediaRule) { if (matchMedia(r.conditionText || r.media.mediaText).matches) walk(r.cssRules); continue; }
      if (r instanceof CSSSupportsRule) { out.push('@supports ' + r.conditionText + ' {'); walk(r.cssRules); out.push('}'); continue; }
      if (r instanceof CSSStyleRule) {
        const body = r.style.cssText;
        let nested = '';
        if (r.cssRules && r.cssRules.length) { const save = out.length; walk(r.cssRules); nested = out.splice(save).join('\\n'); }
        out.push(sel(r.selectorText) + ' { ' + unit(body) + (nested ? '\\n' + nested : '') + ' }');
        continue;
      }
      if (r instanceof CSSKeyframesRule || r instanceof CSSFontFaceRule) { out.push(r.cssText); continue; }
      if (r instanceof CSSImportRule) { if (r.styleSheet) walk(r.styleSheet.cssRules); continue; }
      if (r.cssText) out.push(unit(r.cssText));
    }
  };
  for (const sheet of document.styleSheets) {
    try { walk(sheet.cssRules); } catch (e) { out.push('/* skipped sheet ' + (sheet.href || '') + ' */'); }
  }
  // Freeze form state and canvases into attributes and images.
  const live = document.body;
  const marks = [];
  live.querySelectorAll('input, textarea').forEach((el, i) => { el.setAttribute('data-snap-i', i); marks.push([i, el.value, el === document.activeElement]); });
  const canvases = [];
  live.querySelectorAll('canvas').forEach((c, i) => { try { canvases.push([i, c.toDataURL('image/png'), c.getBoundingClientRect().width, c.getBoundingClientRect().height]); } catch { canvases.push([i, null, 0, 0]); } c.setAttribute('data-snap-c', i); });
  const clone = live.cloneNode(true);
  clone.querySelectorAll('script, noscript').forEach((n) => n.remove());
  // Selects: carry the chosen option as an attribute.
  live.querySelectorAll('select').forEach((sel, i) => sel.setAttribute('data-snap-s', i));
  const selects = Array.from(live.querySelectorAll('select')).map((sel) => sel.selectedIndex);
  for (const [i, value, focused] of marks) {
    const el = clone.querySelector('[data-snap-i="' + i + '"]');
    if (!el) continue;
    if (el.tagName === 'TEXTAREA') el.textContent = value; else el.setAttribute('value', value);
    if (focused) el.setAttribute('data-snap-focus', '');
  }
  clone.querySelectorAll('select').forEach((sel) => {
    const idx = selects[Number(sel.getAttribute('data-snap-s'))];
    Array.from(sel.options).forEach((o, j) => { if (j === idx) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
  });
  for (const [i, url, w, h] of canvases) {
    const c = clone.querySelector('[data-snap-c="' + i + '"]');
    if (!c || !url) continue;
    const img = document.createElement('img');
    img.src = url; img.className = c.className; img.id = c.id;
    img.setAttribute('style', (c.getAttribute('style') || '') + ';width:' + w + 'px;height:' + h + 'px;display:block');
    c.replaceWith(img);
  }
  // Make relative URLs absolute to the snapshot's asset root.
  clone.querySelectorAll('[src]').forEach((el) => { const s = el.getAttribute('src'); if (s && !/^(data:|https?:)/.test(s)) el.setAttribute('src', new URL(s, location.href).pathname); });
  const geo = {};
  for (const [name, q] of Object.entries(opts.measure || {})) {
    const el = document.querySelector(q);
    if (el) { const r = el.getBoundingClientRect(); geo[name] = { x: r.x, y: r.y, w: r.width, h: r.height }; }
  }
  return {
    viewport: { w: W, h: H },
    scroll: { x: scrollX, y: scrollY },
    docHeight: document.documentElement.scrollHeight,
    htmlClass: document.documentElement.className,
    htmlAttrs: Array.from(document.documentElement.attributes).map((a) => [a.name, a.value]),
    bodyClass: live.className,
    bodyStyle: live.getAttribute('style') || '',
    html: clone.innerHTML,
    css: out.join('\\n'),
    geo,
  };
}`;
