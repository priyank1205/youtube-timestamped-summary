// Act 4: the toolbar popup, then the real settings page — Summaries (theme
// switched live), Your AI, Your usage — rendered from snapshots of options.html.
import React from 'react';
import { T } from './T';
import { Snapshot } from '../lib/Snapshot';
import { clamp, ease } from '../lib/time';
import type { Hole } from './Spotlight';

export const POPUP = { x: 1001, y: 88, w: 320, h: 259 };
const PAGE = 86;

// Which captured state of the options page is on screen, and since when (its
// own CSS entrance animations run from that moment).
export function settingsState(t: number): { name: string; start: number } {
  if (t < T.lightClick) return { name: 'settings-summaries', start: T.settingsIn };
  if (t < T.darkClick) return { name: 'settings-summaries-light', start: T.lightClick };
  if (t < T.aiClick) return { name: 'settings-summaries-dark-again', start: T.darkClick };
  if (t < T.usageClick) return { name: 'settings-ai', start: T.aiClick };
  return { name: 'settings-stats', start: T.usageClick };
}

// Theme switches swap the whole preview instantly, as the real page does; the
// card selection itself fades over the page's own 0.18s.
export const SettingsPage: React.FC<{ t: number }> = ({ t }) => {
  const s = settingsState(t);
  const prev = t >= T.lightClick && t < T.lightClick + 0.18 ? 'settings-summaries'
    : t >= T.darkClick && t < T.darkClick + 0.18 ? 'settings-summaries-light' : null;
  const k = prev ? ease.css(clamp((t - (prev === 'settings-summaries' ? T.lightClick : T.darkClick)) / 0.18)) : 1;
  // Your usage: the bloom fills in from the middle, oldest seeds first.
  const onFrame = s.name === 'settings-stats' ? (root: ShadowRoot, tt: number) => {
    const img = root.querySelector('.stat-bloom img, #stat-canvas') as HTMLElement | null;
    if (img) {
      const p = ease.outCubic(clamp((tt - (T.usageClick + 0.15)) / 1.4));
      img.style.clipPath = `circle(${(p * 75).toFixed(2)}% at 50% 50%)`;
    }
  } : undefined;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {prev ? <div style={{ position: 'absolute', inset: 0 }}><Snapshot name={prev} t={t} start={T.settingsIn - 5} width={1440} height={810} /></div> : null}
      <div style={{ position: 'absolute', inset: 0, opacity: k }}>
        <Snapshot name={s.name} t={t} start={s.name.startsWith('settings-summaries-') ? s.start - 5 : s.start} width={1440} height={810} onFrame={onFrame} />
      </div>
    </div>
  );
};

// The extension's toolbar popup, anchored under its icon.
export const Popup: React.FC<{ t: number }> = ({ t }) => {
  const open = t >= T.iconClick && t < T.openSettings + 0.12;
  if (!open) return null;
  const p = ease.outCubic(clamp((t - T.iconClick) / 0.16));
  const close = 1 - clamp((t - T.openSettings) / 0.12);
  return (
    <div style={{
      position: 'absolute', left: POPUP.x, top: POPUP.y, width: POPUP.w, height: POPUP.h, borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 12px 40px rgba(0,0,0,0.55)', background: '#0d0d0f',
      opacity: p * close, transform: `translateY(${(1 - p) * -6}px)`, zIndex: 60,
    }}>
      <Snapshot name="popup" t={t} start={T.iconClick} width={POPUP.w} height={POPUP.h} />
    </div>
  );
};

export const settingsSpotlight = (t: number): { holes: Hole[]; amount: number } => {
  const THEME: Hole = [266, PAGE + 330, 640, 166];
  const PREVIEW: Hole = [1028, PAGE + 50, 392, 692];
  const AI: Hole = [266, PAGE + 206, 604, 404];
  const STATS: Hole = [266, PAGE + 118, 744, 250];
  const on = Math.min(ease.css(clamp((t - (T.capLive - 0.4)) / 0.5)), 1 - ease.css(clamp((t - (T.settingsOut - 0.6)) / 0.4)));
  if (t < T.aiClick) return { holes: [THEME, PREVIEW], amount: on };
  const k = ease.inOutCubic(clamp((t - T.aiClick) / 0.4));
  if (t < T.usageClick) return { holes: [AI, [AI[0] + AI[2] / 2, AI[1] + AI[3] / 2, 0, 0]].map((h, i) => (i === 0 ? h : h)) as Hole[], amount: on * Math.max(0.0, k) };
  return { holes: [STATS, [0, 0, 0, 0]], amount: on };
};
