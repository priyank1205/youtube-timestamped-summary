// The Timestamped Summary panel, rebuilt node for node from scripts/ui-builder.js
// (same elements, same class names, same text) and styled by the extension's own
// stylesheets. It is a pure function of `view` + time: every in-between state of
// a transition is computed here with the CSS's own durations and curves.
import React, { useLayoutEffect, useRef } from 'react';
import '../../../styles/content.css';
import '../../../styles/skin-quiet.css';
import './panel-overrides.css';
import { ALL_POINTS, DETAIL_TARGETS, OVERVIEW, SECTIONS, VIDEO, fmtClock } from '../data/video';
import { BRIEF_CARET_SVG, CHIP_CARET_SVG, GEAR_SVG, HELP_SVG, RESET_SVG } from './panel-svg';
import { clamp, ease } from '../lib/time';
import { pin } from '../lib/anim';

const DETAIL_OPTIONS = [
  { value: 'brief', label: 'Brief', short: 'Major sections only — a quick skim.' },
  { value: 'standard', label: 'Standard', short: 'Balanced coverage — the best default.' },
  { value: 'detailed', label: 'In-depth', short: 'Every topic, with concrete specifics.' },
] as const;

// --- The density field's own arithmetic (ui-builder.js) ----------------------
const SLOTS = 42;
const BAR_H = Array.from({ length: SLOTS }, (_, i) => 0.5 + Math.abs(Math.sin(i * 12.9898 + 3.7)) * 0.5);
const MID = (SLOTS - 1) / 2;
const counts = DETAIL_OPTIONS.map((o) => DETAIL_TARGETS[o.value]);
const densest = Math.max(...counts);
const litSlots = (index: number) => Math.max(1, Math.round((counts[index] / densest) * SLOTS));
const litSet = (count: number) => {
  const lit = new Set<number>();
  if (count <= 1) { lit.add(0); return lit; }
  for (let k = 0; k < count; k++) lit.add(Math.round((k * (SLOTS - 1)) / (count - 1)));
  return lit;
};
const glyphFilled = (index: number) => Math.max(1, Math.round((litSlots(index) / SLOTS) * 5));
const GLYPH_H = [6, 10, 5, 9, 7];

export type LevelChange = { from: number; to: number; at: number };

export type PanelView = {
  mode: 'empty' | 'summary';
  // Empty state ---------------------------------------------------------------
  level: LevelChange;          // the Detail level, with its most recent change
  chipHover?: number;
  pop?: { openedAt: number; closeAt?: number; stopHover?: number[] } | null;
  gen?: { since: number; label: string } | null;
  genHover?: number;
  genPress?: number;
  // Summary state ----------------------------------------------------------------
  summaryAt?: number;
  scrollTop?: number;
  hover?: { index: number; amt: number } | null;
  now?: { index: number; progress: number } | null;
  pulse?: { index: number; at: number } | null;
  expand?: { index: number; at: number; closing?: boolean } | null;
  collapse?: { at: number; reverse?: boolean } | null;
  bodyMaxH?: number;
};

const css = (o: Record<string, string | number | undefined>) => o as React.CSSProperties;

// On-ness of one comb bar at time t, through the CSS transition (0.22s ease,
// delayed by distance from the middle).
function barOn(t: number, ch: LevelChange, i: number) {
  const before = litSet(litSlots(ch.from)).has(i) ? 1 : 0;
  const after = litSet(litSlots(ch.to)).has(i) ? 1 : 0;
  if (before === after) return after;
  const delay = Math.round(Math.abs(i - MID) * 4) / 1000;
  const k = ease.css(clamp((t - ch.at - delay) / 0.22));
  return before + (after - before) * k;
}

function glyphOn(t: number, ch: LevelChange, i: number) {
  const before = i < glyphFilled(ch.from) ? 1 : 0;
  const after = i < glyphFilled(ch.to) ? 1 : 0;
  if (before === after) return after;
  const k = ease.css(clamp((t - ch.at) / 0.2));
  return before + (after - before) * k;
}

export const Panel: React.FC<{ view: PanelView; t: number; width?: number; theme?: 'dark' | 'light' }> = ({ view, t, width = 396, theme = 'dark' }) => {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const panel = el.querySelector('.yt-timestamps-panel') as HTMLElement | null;
    const header = el.querySelector('.yt-timestamps-panel-header') as HTMLElement | null;
    // Hang the Detail module and its scrim off the header exactly as openPop() does.
    if (panel && header) {
      const headerBottom = 1 + header.offsetHeight; // the panel's 1px border, then the header
      const scrim = el.querySelector('.yt-detail-scrim') as HTMLElement | null;
      if (scrim) scrim.style.top = `${headerBottom}px`;
      const pop = el.querySelector('.yt-detail-pop') as HTMLElement | null;
      if (pop) {
        pop.style.left = `${12}px`;
        pop.style.width = `${Math.max(240, panel.offsetWidth - 24)}px`;
        pop.style.top = `${panel.offsetTop + headerBottom + 12}px`;
      }
    }
    // Expanding description: measure its natural height, then set the frame's.
    const exp = el.querySelector('.yt-accordion-content.p-exp') as HTMLElement | null;
    if (exp && view.expand) {
      exp.style.setProperty('--pe-h', 'auto');
      exp.style.setProperty('--pe-pt', '2px');
      exp.style.setProperty('--pe-pb', '14px');
      const full = exp.offsetHeight - 16;
      const dt = t - view.expand.at;
      let k = ease.expand(clamp(dt / 0.2));
      let o = ease.css(clamp((dt - 0.04) / 0.16));
      if (view.expand.closing) { k = 1 - k; o = 1 - ease.css(clamp(dt / 0.16)); }
      exp.style.setProperty('--pe-h', `${(full * k).toFixed(2)}px`);
      exp.style.setProperty('--pe-pt', `${(2 * k).toFixed(2)}px`);
      exp.style.setProperty('--pe-pb', `${(14 * k).toFixed(2)}px`);
      exp.style.setProperty('--pe-o', `${o.toFixed(3)}`);
    }
    // Scroll position of the list (as a transform: a renderer re-show would
    // reset scrollTop), and the painted scrollbar that follows it.
    const body = el.querySelector('.yt-accordion-body') as HTMLElement | null;
    const list = el.querySelector('.yt-timestamps-list') as HTMLElement | null;
    if (body && list) {
      const vis = body.clientHeight, total = list.offsetHeight;
      const maxScroll = Math.max(0, total - vis);
      const st = clamp(view.scrollTop || 0, 0, maxScroll);
      list.style.transform = st ? `translateY(${-st}px)` : '';
      const bar = el.querySelector('.p-scrollbar') as HTMLElement | null;
      if (bar) {
        if (total > vis + 1 && vis > 40) {
          bar.style.display = 'block';
          bar.style.top = `${body.offsetTop}px`;
          bar.style.height = `${vis}px`;
          const thumb = bar.firstElementChild as HTMLElement;
          const th = Math.max(24, (vis * vis) / total);
          const top = maxScroll ? ((vis - th) * st) / maxScroll : 0;
          thumb.style.height = `${th - 4}px`;
          thumb.style.top = `${top + 2}px`;
          bar.style.opacity = String(clamp(vis / 120));
        } else bar.style.display = 'none';
      }
    }
  });

  const ch = view.level;
  const level = ch.to;
  const opt = DETAIL_OPTIONS[level];
  const pop = view.pop && (view.pop.closeAt === undefined || t < view.pop.closeAt) ? view.pop : null;
  const containerCls = ['yt-timestamps-container', 'yt-skin-quiet'];
  if (theme === 'light') containerCls.push('yt-theme-light');
  if (view.mode === 'summary') containerCls.push('yt-has-summary');
  if (pop) containerCls.push('yt-detail-open');

  // --- Empty state ---------------------------------------------------------------
  const renderEmpty = () => {
    const gen = view.gen;
    const chipCaret = pop ? ease.css(clamp((t - pop.openedAt) / 0.18)) * 180 : 0;
    return (
      <div className={`yt-timestamps-panel${gen ? ' yt-generating' : ''}`} style={css({ '--p-at': gen ? t - gen.since : 0 })}>
        <div className="yt-timestamps-panel-header">
          <div className="yt-timestamps-header-left">
            <h3 className="yt-timestamps-panel-header-title">Timestamped Summary</h3>
            <div className="yt-detail-chip-wrap">
              <button type="button" className={`yt-detail-chip p-chip${pop ? ' open' : ''}`} title="Summary detail" data-m="chip"
                style={css({ '--ph': view.chipHover || 0, '--pc': chipCaret })}>
                <span className="yt-detail-glyph" aria-hidden="true">
                  {GLYPH_H.map((h, i) => (
                    <i key={i} className="p-g" style={css({ '--pg': glyphOn(t, ch, i), '--pgh': `${h}px` })} />
                  ))}
                </span>
                <span className="yt-detail-chip-label">{opt.label}</span>
                <span className="yt-detail-chip-caret" dangerouslySetInnerHTML={{ __html: CHIP_CARET_SVG }} />
              </button>
            </div>
          </div>
          <span className="gear-icon" data-m="gear" dangerouslySetInnerHTML={{ __html: GEAR_SVG }} />
        </div>
        <div className="yt-timestamps-panel-body">
          <div className="yt-timestamps-empty-state">
            <div className="yt-ghost-preview" aria-hidden="true">
              <div className="yt-ghost-row"><span className="yt-ghost-chip" style={gen ? pin(t, gen.since) : undefined} /><span className="yt-ghost-bar" style={{ width: '76%', ...(gen ? pin(t, gen.since) : {}) }} /></div>
              <div className="yt-ghost-row"><span className="yt-ghost-chip" style={gen ? pin(t, gen.since, 0.18) : undefined} /><span className="yt-ghost-bar" style={{ width: '58%', ...(gen ? pin(t, gen.since, 0.18) : {}) }} /></div>
            </div>
            <div className="yt-empty-text">An overview, then chapters linked to the video</div>
          </div>
          <div id="action-area" className="yt-timestamps-action-area">
            <button className="yt-timestamps-generate-button p-gen" disabled={!!gen} data-m="generate"
              style={css({ '--ph': view.genHover || 0, '--pp': view.genPress || 0 })}>
              {gen ? <span className="yt-spinner" style={pin(t, gen.since)} /> : null}
              {gen ? gen.label : 'Generate summary'}
            </button>
          </div>
        </div>
        {pop ? <div className="yt-detail-scrim" style={pin(t, pop.openedAt)} /> : null}
      </div>
    );
  };

  const renderPop = () => {
    if (!pop) return null;
    const lit = Array.from({ length: SLOTS }, (_, i) => barOn(t, ch, i));
    const count = DETAIL_TARGETS[opt.value];
    const axis = [0, VIDEO.duration / 2, VIDEO.duration].map((s) => fmtClock(Math.round(s)));
    return (
      <div className="yt-detail-pop yt-detail-pop-comb" role="dialog" aria-label="Summary detail" style={pin(t, pop.openedAt)} data-m="pop">
        <div className="yt-comb">
          <div className="yt-comb-head">
            <div className="yt-comb-lead">
              <span className="yt-comb-label">Detail — sampling</span>
              <button type="button" className="yt-detail-help-btn" title="What does this level mean?" dangerouslySetInnerHTML={{ __html: HELP_SVG }} />
            </div>
            <span className="yt-comb-readout" data-m="readout">
              <span className="yt-comb-read-approx">≈</span>
              <span className="yt-comb-read-n">{count}</span>
              <span className="yt-comb-read-u">points</span>
            </span>
          </div>
          <div className="yt-comb-field" role="slider" data-m="field">
            {lit.map((k, i) => (
              <span key={i} className="yt-comb-bar p-bar"
                style={css({ '--yt-comb-h': `${Math.round(BAR_H[i] * 100)}%`, '--yt-comb-d': `${Math.round(Math.abs(i - MID) * 4)}ms`, '--pb': k })} />
            ))}
          </div>
          <div className="yt-comb-axis">{axis.map((a, i) => <span key={i}>{a}</span>)}</div>
          <div className="yt-comb-stops">
            {DETAIL_OPTIONS.map((o, i) => {
              const was = i === ch.from ? 1 : 0, is = i === ch.to ? 1 : 0;
              const k = ease.css(clamp((t - ch.at) / 0.15));
              const pa = was + (is - was) * k;
              return (
                <button key={o.value} type="button" className="yt-comb-stop p-stop" data-m={`stop-${i}`}
                  style={css({ '--pa': pa, '--ph': view.pop?.stopHover?.[i] || 0 })}>{o.label}</button>
              );
            })}
          </div>
          <div className="yt-comb-desc">{opt.short}</div>
        </div>
        <div className="yt-detail-help" hidden />
      </div>
    );
  };

  // --- Summary state -------------------------------------------------------------
  const renderSummary = () => {
    const summaryAt = view.summaryAt ?? 0;
    const sweeping = t - summaryAt < 0.9;
    let order = 1;
    let pointIndex = 0;
    const nowSec = view.now ? ALL_POINTS[view.now.index].sec : Number.NEGATIVE_INFINITY;
    const col = view.collapse;
    let colK = 0, colO = 1, rot = -90;
    if (col) {
      const dt = t - col.at;
      const k = ease.material(clamp(dt / 0.3));
      const o = ease.css(clamp(dt / 0.3));
      const r = ease.css(clamp(dt / 0.3));
      colK = col.reverse ? 1 - k : k;
      colO = col.reverse ? o : 1 - o;
      rot = col.reverse ? -90 * r : -90 + 90 * r;
    }
    const maxH = view.bodyMaxH ?? 610;
    const fullyCollapsed = col && !col.reverse && t - col.at >= 0.3;
    const rows: React.ReactNode[] = [];
    SECTIONS.forEach((s, si) => {
      const so = order++;
      rows.push(<div key={`s${si}`} className="yt-section-header" style={css({ '--yt-i': so, ...pin(t, summaryAt, Math.min(so * 0.035, 0.49)) })} data-m={`section-${si}`}>{s.title}</div>);
      s.points.forEach((p) => {
        const idx = pointIndex++;
        const isNow = view.now?.index === idx;
        const isPast = !isNow && p.sec < nowSec;
        const hov = view.hover?.index === idx ? view.hover.amt : 0;
        const exp = view.expand?.index === idx ? view.expand : null;
        let chev = 45;
        let expanded = false;
        let animating = false;
        if (exp) {
          const dt = t - exp.at;
          const sp = ease.springy(clamp(dt / 0.3));
          chev = exp.closing ? -135 + 180 * sp : 45 - 180 * sp;
          expanded = !exp.closing;
          animating = dt < 0.25;
        }
        const pulse = view.pulse?.index === idx ? view.pulse : null;
        const cls = ['yt-timestamp-item'];
        if (isNow) cls.push('yt-now');
        if (isPast) cls.push('yt-past');
        if (exp && !exp.closing) cls.push('yt-row-open');
        if (pulse && t >= pulse.at) cls.push('yt-seek-pulse');
        if (hov > 0 || (exp && !exp.closing)) cls.push('p-hov');
        const ph = exp && !exp.closing ? Math.max(hov, 1) : hov;
        const ro = order++;
        rows.push(
          <div key={`p${idx}`} className={cls.join(' ')} data-m={`row-${idx}`}
            style={css({ '--yt-i': ro, '--ph': ph, '--p-pulse': pulse ? t - pulse.at : 0, '--yt-now-progress': isNow ? `${(view.now!.progress * 100).toFixed(2)}%` : undefined, ...pin(t, summaryAt, Math.min(ro * 0.035, 0.49)) })}>
            <div className="yt-glow-border" />
            <span className="yt-time-label">
              <span className="yt-time" data-m={`time-${idx}`}><span className="yt-time-text">{p.time}</span></span>{' '}
              <span className="yt-title">{p.title}</span>
            </span>
            <span className={`yt-expand-btn p-chev${expanded ? ' yt-open' : ''}`} data-m={`chev-${idx}`} style={css({ '--pv': chev })}>{expanded ? '−' : '+'}</span>
          </div>,
        );
        const contentCls = ['yt-accordion-content'];
        if (exp && (animating || exp.closing)) contentCls.push('p-exp');
        else if (exp && !exp.closing) contentCls.push('expanded');
        rows.push(<div key={`c${idx}`} className={contentCls.join(' ')} data-m={`desc-${idx}`}>{p.desc}</div>);
      });
    });
    return (
      <div className={`yt-timestamps-panel${sweeping ? ' yt-done-sweep' : ''}`} style={css({ '--p-at': t - summaryAt })}>
        <div className="yt-timestamps-panel-header" style={{ cursor: 'pointer' }} data-m="header">
          <div className="yt-timestamps-header-left">
            <h3 className="yt-timestamps-panel-header-title" data-m="title">Timestamped Summary</h3>
            <button type="button" className="yt-reset-btn" title="Discard this summary and choose a new detail level" data-m="reset">
              <span dangerouslySetInnerHTML={{ __html: RESET_SVG }} style={{ display: 'contents' }} />
              <span>Start over</span>
            </button>
          </div>
          <span className={`yt-accordion-toggle-icon p-tog${fullyCollapsed ? ' collapsed' : ''}`} style={css({ '--pt': rot })} data-m="toggle">›</span>
        </div>
        <div className={`yt-timestamps-panel-content yt-accordion-body${fullyCollapsed ? ' collapsed' : ''}`}
          style={fullyCollapsed ? undefined : { maxHeight: col ? `${maxH * (1 - colK)}px` : `${maxH}px`, opacity: colO }}>
          <div className="yt-timestamps-list">
            <div className="yt-gist" style={css({ '--yt-i': 0, ...pin(t, summaryAt, 0) })} data-m="gist">
              <div className="yt-brief">
                <p className="yt-gist-text" id="yt-gist-text">{OVERVIEW}</p>
                <div className="yt-gist-actions">
                  <button type="button" className="yt-gist-link yt-gist-more" aria-expanded="false">Show more</button>
                  <span className="yt-gist-sep" aria-hidden="true">·</span>
                  <button type="button" className="yt-gist-link yt-gist-copy" title="Copy the overview">Copy</button>
                  <button type="button" className="yt-brief-detail" aria-expanded="false" title="How this summary was generated">
                    <span>{DETAIL_OPTIONS[level].label}</span>
                    <span className="yt-brief-caret" dangerouslySetInnerHTML={{ __html: BRIEF_CARET_SVG }} />
                  </button>
                </div>
                <div className="yt-brief-meta" hidden>gemini-flash-lite-latest</div>
              </div>
            </div>
            {rows}
          </div>
        </div>
        <div className="p-scrollbar"><i /></div>
      </div>
    );
  };

  return (
    <div ref={root} className={containerCls.join(' ')} style={{ width }} data-m="panel">
      {view.mode === 'empty' ? renderEmpty() : renderSummary()}
      {view.mode === 'empty' ? renderPop() : null}
    </div>
  );
};
