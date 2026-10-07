// The editor's red pen: hand-drawn circles, underlines, arrows, strike-throughs
// and margin notes, written on as t passes. Drawn in window space, above the
// browser, so they stay pinned to what they mark while the camera moves.
import React from 'react';
import { clamp, ease, lerp, rand } from '../lib/time';
import { SERIF, usePal } from './style';

const STROKE = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

// A loose ellipse drawn in one go: a little more than one turn, wobbling, the
// end overshooting the start the way a quick pen circle does.
function ellipsePath(cx: number, cy: number, rx: number, ry: number, seed: number) {
  const n = 72, turns = 1.12, a0 = -2.3 + rand(seed) * 0.6, tilt = (-5 + rand(seed + 1) * 4) * Math.PI / 180;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = a0 + u * turns * Math.PI * 2;
    const grow = 1 + 0.07 * u;
    const wob = 1 + 0.025 * Math.sin(u * 9 + seed) + 0.015 * Math.sin(u * 23 + seed * 2);
    const x = Math.cos(a) * rx * grow * wob, y = Math.sin(a) * ry * grow * wob;
    pts.push(`${(cx + x * Math.cos(tilt) - y * Math.sin(tilt)).toFixed(1)},${(cy + x * Math.sin(tilt) + y * Math.cos(tilt)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

export type PenMark =
  | { kind: 'circle'; at: number; out: number; cx: number; cy: number; rx: number; ry: number; w?: number; dur?: number; seed?: number }
  | { kind: 'underline'; at: number; out: number; x: number; y: number; len: number; w?: number; dur?: number }
  | { kind: 'strike'; at: number; out: number; x: number; y: number; len: number; w?: number; dur?: number }
  | { kind: 'arrow'; at: number; out: number; from: [number, number]; to: [number, number]; bend?: number; w?: number; dur?: number }
  | { kind: 'note'; at: number; out: number; x: number; y: number; text: string; size?: number; dur?: number; align?: 'left' | 'center' | 'right'; rot?: number; tab?: boolean };

const fadeOut = (t: number, out: number) => 1 - clamp((t - out) / 0.4);

export const Pen: React.FC<{ marks: PenMark[]; t: number }> = ({ marks, t }) => {
  const C = usePal();
  return (
  <>
    {marks.map((m, i) => {
      if (t < m.at || t > m.out + 0.45) return null;
      const dur = m.dur ?? (m.kind === 'note' ? 0.7 : m.kind === 'arrow' ? 0.55 : 0.5);
      const p = ease.inOutCubic(clamp((t - m.at) / dur));
      const o = fadeOut(t, m.out);
      if (m.kind === 'note') {
        const size = m.size ?? 30;
        // Over dark UI a note goes on a scrap of paper, stuck on at an angle.
        const tabIn = ease.outBack(clamp((t - m.at + 0.12) / 0.3));
        return (
          <div key={i} style={{ position: 'absolute', left: m.x, top: m.y, transform: `translate(${m.align === 'center' ? '-50%' : m.align === 'right' ? '-100%' : '0'}, -50%) rotate(${m.rot ?? -2}deg) scale(${m.tab ? 0.85 + 0.15 * tabIn : 1})`, opacity: o * (m.tab ? clamp((t - m.at + 0.12) / 0.15) : 1), whiteSpace: 'nowrap' }}>
            <div style={m.tab ? { background: C.tab, padding: `${size * 0.12}px ${size * 0.42}px ${size * 0.18}px`, borderRadius: size * 0.08, boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 6px 16px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.25)' } : undefined}>
              <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: size, color: m.tab ? C.tabInk : C.redInk, lineHeight: 1.1, clipPath: `inset(-20% ${(1 - p) * 100}% -20% -5%)` }}>{m.text}</div>
            </div>
          </div>
        );
      }
      const w = m.w ?? 3.2;
      let d = '';
      let head = '';
      if (m.kind === 'circle') d = ellipsePath(m.cx, m.cy, m.rx, m.ry, m.seed ?? i * 3 + 1);
      if (m.kind === 'underline') d = `M${m.x},${m.y} C${m.x + m.len * 0.3},${m.y + 3} ${m.x + m.len * 0.7},${m.y - 2.5} ${m.x + m.len},${m.y + 1.5}`;
      if (m.kind === 'strike') d = `M${m.x},${m.y + 1} C${m.x + m.len * 0.35},${m.y - 2} ${m.x + m.len * 0.65},${m.y + 2} ${m.x + m.len},${m.y - 1}`;
      if (m.kind === 'arrow') {
        const [x0, y0] = m.from, [x1, y1] = m.to;
        const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len, bend = (m.bend ?? 0.22) * len;
        const cx = (x0 + x1) / 2 + nx * bend, cy = (y0 + y1) / 2 + ny * bend;
        d = `M${x0},${y0} Q${cx},${cy} ${x1},${y1}`;
        // arrowhead along the curve's end tangent
        const tx = x1 - cx, ty = y1 - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
        const hl = 18 + w * 2, sp = 0.5;
        const ax = x1 - hl * (ux * Math.cos(sp) - uy * Math.sin(sp)), ay = y1 - hl * (uy * Math.cos(sp) + ux * Math.sin(sp));
        const bx = x1 - hl * (ux * Math.cos(-sp) - uy * Math.sin(-sp)), by = y1 - hl * (uy * Math.cos(-sp) + ux * Math.sin(-sp));
        head = `M${ax.toFixed(1)},${ay.toFixed(1)} L${x1},${y1} L${bx.toFixed(1)},${by.toFixed(1)}`;
      }
      const hp = m.kind === 'arrow' ? ease.outCubic(clamp((t - m.at - dur * 0.85) / 0.18)) : 0;
      return (
        <svg key={i} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o, pointerEvents: 'none' }} width="1" height="1">
          <path d={d} {...STROKE} stroke={C.redInk} strokeWidth={w} pathLength={1} strokeDasharray="1 1" strokeDashoffset={lerp(1, 0, p)} />
          {head ? <path d={head} {...STROKE} stroke={C.redInk} strokeWidth={w} pathLength={1} strokeDasharray="1 1" strokeDashoffset={lerp(1, 0, hp)} /> : null}
        </svg>
      );
    })}
  </>
  );
};
