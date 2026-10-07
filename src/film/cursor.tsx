// The on-screen pointer: macOS arrow and pointing hand, moving along gently
// arced, eased paths, with a press-dip and a soft ripple on every click. Lives
// in window space, so it scales with the camera like a screen recording would.
import React from 'react';
import { bezier, clamp, ease, lerp } from '../lib/time';

export type CursorMove = { at: number; dur: number; x: number; y: number; hand?: boolean; arc?: number };
export type CursorFollow = { from: number; to: number; at: (t: number) => { x: number; y: number }; hand?: boolean };
export type CursorTrack = { start: { x: number; y: number; hand?: boolean }; moves: CursorMove[]; clicks: number[]; show?: Array<[number, number]>; follow?: CursorFollow[] };

const moveEase = bezier(0.42, 0, 0.12, 1);

export function cursorAt(track: CursorTrack, t: number): { x: number; y: number; hand: boolean; press: number; visible: number } {
  // Segments where the pointer is glued to something (a dragged scrubber).
  for (const f of track.follow || []) {
    if (t >= f.from && t <= f.to) { const p = f.at(t); return { x: p.x, y: p.y, hand: !!f.hand, press: pressAt(track, t), visible: visibleAt(track, t) }; }
  }
  let x = track.start.x, y = track.start.y, hand = !!track.start.hand;
  const moves = [...track.moves].sort((a, b) => a.at - b.at);
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const t0 = m.at - m.dur;
    if (t >= m.at) { x = m.x; y = m.y; hand = !!m.hand; continue; }
    if (t > t0) {
      const p = moveEase(clamp((t - t0) / m.dur));
      const dx = m.x - x, dy = m.y - y, dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist, ny = dx / dist;
      const off = (m.arc ?? (i % 2 ? 0.08 : -0.08)) * dist;
      // Cubic bezier with both handles pushed off the straight line.
      const c1x = x + dx * 0.3 + nx * off, c1y = y + dy * 0.3 + ny * off;
      const c2x = x + dx * 0.75 + nx * off * 0.5, c2y = y + dy * 0.75 + ny * off * 0.5;
      const u = 1 - p;
      const bx = u * u * u * x + 3 * u * u * p * c1x + 3 * u * p * p * c2x + p * p * p * m.x;
      const by = u * u * u * y + 3 * u * u * p * c1y + 3 * u * p * p * c2y + p * p * p * m.y;
      // The hand appears once the pointer is mostly over its target.
      return { x: bx, y: by, hand: p > 0.85 ? !!m.hand : hand, press: pressAt(track, t), visible: visibleAt(track, t) };
    }
    break;
  }
  return { x, y, hand, press: pressAt(track, t), visible: visibleAt(track, t) };
}

function pressAt(track: CursorTrack, t: number) {
  let s = 0;
  for (const c of track.clicks) {
    const d = t - c;
    if (d > -0.06 && d < 0.22) s = Math.max(s, d < 0 ? (d + 0.06) / 0.06 : 1 - ease.outCubic(clamp(d / 0.22)));
  }
  return s;
}

function visibleAt(track: CursorTrack, t: number) {
  if (!track.show) return 1;
  let v = 0;
  for (const [a, b] of track.show) {
    if (t >= a && t <= b) v = Math.max(v, Math.min(clamp((t - a) / 0.25), clamp((b - t) / 0.25)));
  }
  return v;
}

const Arrow = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
    <path d="M5 2.5 L5 22 L9.6 17.7 L12.6 24.6 L15.7 23.3 L12.7 16.5 L19 16.5 Z" fill="#000" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const Hand = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" style={{ overflow: 'visible' }}>
    <path d="M10.2 2.6c-1.15 0-2.05.9-2.05 2.05v9.6l-1.35-1.35c-.82-.82-2.15-.82-2.97 0-.8.8-.82 2.1-.04 2.93l5.1 5.6c1.25 1.37 3 2.17 4.85 2.17h3.6c3 0 5.4-2.43 5.4-5.4v-6.05c0-1.04-.85-1.88-1.9-1.88-.48 0-.92.18-1.25.47-.23-.83-.98-1.43-1.88-1.43-.47 0-.9.17-1.23.45-.24-.8-.98-1.38-1.85-1.38-.37 0-.72.1-1.02.29V4.65c0-1.15-.9-2.05-2.05-2.05z"
      fill="#fff" stroke="#000" strokeWidth="1.35" strokeLinejoin="round" />
    <path d="M12.3 15.2v4.2M15.3 15.2v4.2M18.3 15.4v4" stroke="#000" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const Cursor: React.FC<{ track: CursorTrack; t: number; scale?: number }> = ({ track, t, scale = 1 }) => {
  const c = cursorAt(track, t);
  if (c.visible <= 0) return null;
  const s = scale * (1 - 0.14 * c.press);
  const ripples = track.clicks.filter((k) => t >= k && t < k + 0.6).map((k) => {
    const p = clamp((t - k) / 0.6);
    const pos = cursorAt(track, k);
    return (
      <div key={k} style={{
        position: 'absolute', left: pos.x, top: pos.y, width: 0, height: 0, pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', left: -lerp(6, 30, ease.outCubic(p)), top: -lerp(6, 30, ease.outCubic(p)),
          width: 2 * lerp(6, 30, ease.outCubic(p)), height: 2 * lerp(6, 30, ease.outCubic(p)), borderRadius: '50%',
          border: `${lerp(3, 1, p)}px solid rgba(255,255,255,${0.55 * (1 - p)})`, background: `rgba(255,255,255,${0.12 * (1 - p)})`,
        }} />
      </div>
    );
  });
  // The arrow's hotspot is its tip; the hand's is the fingertip.
  const hx = c.hand ? 10.2 : 5, hy = c.hand ? 2.6 : 2.5;
  return (
    <>
      {ripples}
      <div style={{
        position: 'absolute', left: c.x - hx * s, top: c.y - hy * s, transform: `scale(${s})`, transformOrigin: '0 0',
        opacity: c.visible, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.45))', pointerEvents: 'none', zIndex: 50,
      }}>
        {c.hand ? <Hand /> : <Arrow />}
      </div>
    </>
  );
};
