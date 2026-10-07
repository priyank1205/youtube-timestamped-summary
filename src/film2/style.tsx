// "Daylight", the second film's look: warm paper, ink-black serif headlines, an
// editor's red pen, and the product framed like a photograph on the page. The
// same film also runs at night (`theme="dark"`): a warm near-black sheet, light
// type, a brighter red, and the product in dark mode.
import React, { createContext, useContext } from 'react';
import { AbsoluteFill } from 'remotion';
import { serif, inter } from '../lib/fonts';
import { clamp, ease, lerp, Ease } from '../lib/time';

export type Theme2 = 'light' | 'dark';
const LIGHT = {
  paper: '#F3EFE7', paperRGB: '243,239,231', mat: '#E6DFD2', ink: '#16140F', ink2: '#5B544A', ink3: '#8E867A',
  rule: 'rgba(22,20,15,0.16)', red: '#D3203A', redInk: 'rgba(211,32,58,0.95)',
  // notes stuck onto the UI: a scrap of paper, written in red
  tab: '#F3EFE7', tabInk: 'rgba(211,32,58,0.95)',
  light: 'rgba(255,255,255,0.6)', vignette: 'rgba(70,48,22,0.12)', fibre: { opacity: 0.32, blend: 'multiply' as 'multiply' | 'screen', rgb: '0.45 0.38 0.3', a: 0.16 },
  frameShadow: 'inset 0 0 0 1px rgba(22,20,15,0.09), 0 1px 0 rgba(255,255,255,0.8), 0 30px 70px rgba(70,48,22,0.12), 0 6px 18px rgba(70,48,22,0.08)',
  matGlow: 'rgba(255,255,255,0.35)', stampShadow: 'drop-shadow(0 18px 26px rgba(90,20,30,0.22)) drop-shadow(0 3px 6px rgba(90,20,30,0.18))',
  cta: '#16140F', ctaText: '#F3EFE7', ctaSub: 'rgba(243,239,231,0.66)', ctaShadow: '0 1px 0 rgba(255,255,255,0.12) inset, 0 22px 44px rgba(40,28,14,0.22), 0 4px 10px rgba(40,28,14,0.16)', ctaArrow: '#FF5A6C',
};
const DARK: typeof LIGHT = {
  paper: '#12110F', paperRGB: '18,17,15', mat: '#1C1A17', ink: '#EEE8DD', ink2: '#A9A195', ink3: '#6F685E',
  rule: 'rgba(238,232,221,0.15)', red: '#FF5466', redInk: 'rgba(255,84,102,0.96)',
  tab: '#EFE8DC', tabInk: 'rgba(200,22,48,0.96)',
  light: 'rgba(255,236,210,0.07)', vignette: 'rgba(0,0,0,0.55)', fibre: { opacity: 0.22, blend: 'screen' as const, rgb: '0.95 0.9 0.82', a: 0.07 },
  frameShadow: 'inset 0 0 0 1px rgba(255,245,230,0.07), 0 1px 0 rgba(255,255,255,0.04), 0 34px 80px rgba(0,0,0,0.6), 0 8px 22px rgba(0,0,0,0.45)',
  matGlow: 'rgba(255,240,220,0.035)', stampShadow: 'drop-shadow(0 20px 30px rgba(0,0,0,0.6)) drop-shadow(0 0 34px rgba(255,40,72,0.22))',
  cta: '#EEE8DD', ctaText: '#12110F', ctaSub: 'rgba(18,17,15,0.6)', ctaShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 22px 50px rgba(0,0,0,0.55), 0 0 60px rgba(255,236,210,0.06)', ctaArrow: '#D3203A',
};
export type Palette = typeof LIGHT;
export const PALETTES: Record<Theme2, Palette> = { light: LIGHT, dark: DARK };
const PaletteCtx = createContext<Palette>(LIGHT);
export const PaletteProvider: React.FC<{ theme: Theme2; children: React.ReactNode }> = ({ theme, children }) => <PaletteCtx.Provider value={PALETTES[theme]}>{children}</PaletteCtx.Provider>;
export const usePal = () => useContext(PaletteCtx);
export const SERIF = `${serif}, "Times New Roman", serif`;
export const SANS = `${inter}, -apple-system, BlinkMacSystemFont, sans-serif`;

// ── Paper ─────────────────────────────────────────────────────────────────────────
// A warm sheet with a soft window light from the top left and a fixed fibre
// texture (paper doesn't flicker the way film grain does).
export const Paper: React.FC = () => {
  const C = usePal();
  const [r, g, b] = C.fibre.rgb.split(' ');
  return (
    <AbsoluteFill style={{ background: C.paper, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(85% 75% at 22% 12%, ${C.light}, rgba(255,255,255,0) 62%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(150% 130% at 50% 45%, rgba(0,0,0,0) 58%, ${C.vignette} 100%)` }} />
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: C.fibre.opacity, mixBlendMode: C.fibre.blend }}>
        <filter id="paper-fibre"><feTurbulence type="fractalNoise" baseFrequency="0.85 0.6" numOctaves="3" seed="7" stitchTiles="stitch" /><feColorMatrix type="matrix" values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 ${C.fibre.a} 0`} /></filter>
        <rect width="100%" height="100%" filter="url(#paper-fibre)" />
      </svg>
    </AbsoluteFill>
  );
};

// ── The frame ────────────────────────────────────────────────────────────────────
// The browser sits in a matted frame on the page. The frame itself moves
// between layouts (full bleed, or a column of text beside it); a camera moves
// inside it, in window space, like the first film's.
export type Rect = { x: number; y: number; w: number; h: number; r: number };
export const LAYOUT: Record<'full' | 'right' | 'left' | 'away', Rect> = {
  full: { x: 0, y: 0, w: 1920, h: 1080, r: 0 },
  right: { x: 694, y: 78, w: 1148, h: 924, r: 30 },
  left: { x: 78, y: 78, w: 1148, h: 924, r: 30 },
  away: { x: 694 + 1300, y: 78, w: 1148, h: 924, r: 30 },
};
type FrameMove = { at: number; dur: number; to: Rect; e?: Ease };
export function framePath(start: Rect, moves: FrameMove[]) {
  const ks = [...moves].sort((a, b) => a.at - b.at);
  return (t: number): Rect => {
    let cur = start;
    for (const m of ks) {
      if (t >= m.at) { cur = m.to; continue; }
      if (t > m.at - m.dur) {
        const p = (m.e || ease.inOutCubic)(clamp((t - (m.at - m.dur)) / m.dur));
        return { x: lerp(cur.x, m.to.x, p), y: lerp(cur.y, m.to.y, p), w: lerp(cur.w, m.to.w, p), h: lerp(cur.h, m.to.h, p), r: lerp(cur.r, m.to.r, p) };
      }
      break;
    }
    return cur;
  };
}

export type Cam2 = { x: number; y: number; z: number };
export const Frame: React.FC<{ rect: Rect; cam: Cam2; children: React.ReactNode; opacity?: number }> = ({ rect, cam, children, opacity = 1 }) => {
  const C = usePal();
  const full = rect.r < 1 && rect.w >= 1919;
  return (
    <div style={{
      position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: rect.r, overflow: 'hidden', opacity,
      background: C.mat, boxShadow: full ? 'none' : C.frameShadow,
    }}>
      {/* the mat: a little lighter at the top, like the paper around it */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${C.matGlow}, rgba(255,255,255,0) 40%)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: 896, transformOrigin: '0 0', transform: `translate(${rect.w / 2}px, ${rect.h / 2}px) scale(${cam.z}) translate(${-cam.x}px, ${-cam.y}px)` }}>
        {children}
      </div>
    </div>
  );
};

// ── Type ──────────────────────────────────────────────────────────────────────────
// `*word*` is set in italic red. Lines rise out of a mask one after another.
export function Rich({ text, accent }: { text: string; accent?: string }) {
  const C = usePal();
  accent = accent ?? C.red;
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return <>{parts.map((p, i) => (p.startsWith('*') ? <em key={i} style={{ fontStyle: 'italic', color: accent }}>{p.slice(1, -1)}</em> : <React.Fragment key={i}>{p}</React.Fragment>))}</>;
}

export const Lines: React.FC<{ t: number; at: number; out?: number; lines: string[]; size: number; lh?: number; stagger?: number; color?: string; family?: string; weight?: number; track?: string; align?: 'left' | 'center' | 'right'; accent?: string }> = ({ t, at, out = 1e9, lines, size, lh = 1.02, stagger = 0.09, color, family = SERIF, weight = 400, track = '-0.012em', align = 'left', accent }) => {
  const C = usePal();
  const exit = ease.inCubic(clamp((t - out) / 0.45));
  return (
    <div style={{ fontFamily: family, fontSize: size, lineHeight: lh, color: color ?? C.ink, fontWeight: weight, letterSpacing: track, textAlign: align, opacity: 1 - exit, transform: `translateY(${-14 * exit}px)` }}>
      {lines.map((l, i) => {
        const p = ease.outQuart(clamp((t - at - i * stagger) / 0.85));
        return (
          <div key={i} style={{ overflow: 'hidden', paddingBottom: size * 0.12, marginBottom: -size * 0.12 }}>
            <div style={{ transform: `translateY(${lerp(108, 0, p)}%)`, opacity: clamp((t - at - i * stagger) / 0.3) }}><Rich text={l} accent={accent} /></div>
          </div>
        );
      })}
    </div>
  );
};

// A small label: a red number, a hairline, an uppercase tag.
export const Kicker: React.FC<{ t: number; at: number; out?: number; num?: string; label: string; color?: string }> = ({ t, at, out = 1e9, num, label, color }) => {
  const C = usePal();
  color = color ?? C.ink2;
  const p = ease.outQuart(clamp((t - at) / 0.7));
  const exit = clamp((t - out) / 0.35);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: SANS, fontSize: 15, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color, opacity: clamp((t - at) / 0.35) * (1 - exit) }}>
      {num ? <span style={{ color: C.red, fontVariantNumeric: 'tabular-nums' }}>{num}</span> : null}
      {num ? <span style={{ width: 36 * p, height: 1, background: 'currentColor', opacity: 0.6 }} /> : null}
      <span>{label}</span>
    </div>
  );
};
