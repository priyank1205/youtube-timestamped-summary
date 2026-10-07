// Kinetic captions: the film's narration, set large. Words rise out of a mask
// one after another and the line lifts away on exit. `*word*` marks an accent.
import React from 'react';
import { interTight } from '../lib/fonts';
import { clamp, ease, lerp } from '../lib/time';

export type CaptionPos = 'tl' | 'bl' | 'tr' | 'br' | 'center' | 'left' | 'right' | 'top' | 'bottom';
export type CaptionSpec = {
  at: number; out: number; text: string; sub?: string; pos?: CaptionPos; size?: number;
  scrim?: number; width?: number; accent?: string; align?: 'left' | 'center' | 'right'; x?: number; y?: number;
  step?: number; steps?: number; strike?: boolean;
};

export const ACCENT = '#ff5c5c';

const Word: React.FC<{ w: string; i: number; t: number; at: number; accent: string; stagger: number }> = ({ w, i, t, at, accent, stagger }) => {
  const local = t - at - i * stagger;
  const p = ease.outExpo(clamp(local / 0.7));
  const isAccent = /^\*.*\*[.,!?:;’']*$/.test(w);
  const clean = w.replace(/\*/g, '');
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.14em', marginBottom: '-0.14em' }}>
      <span style={{
        display: 'inline-block', transform: `translateY(${lerp(105, 0, p)}%)`, opacity: clamp(local / 0.25),
        color: isAccent ? accent : undefined, whiteSpace: 'pre',
      }}>{clean}</span>
    </span>
  );
};

export const Caption: React.FC<{ c: CaptionSpec; t: number }> = ({ c, t }) => {
  if (t < c.at - 0.05 || t > c.out + 0.5) return null;
  const size = c.size ?? 64;
  const pos = c.pos ?? 'bl';
  const accent = c.accent ?? ACCENT;
  const exit = ease.inCubic(clamp((t - c.out) / 0.4));
  const scrimO = (c.scrim ?? 0.75) * Math.min(clamp((t - c.at + 0.2) / 0.4), 1 - exit);
  const words = c.text.split(' ');
  const align = c.align ?? (pos === 'center' || pos === 'top' || pos === 'bottom' ? 'center' : pos.endsWith('r') || pos === 'right' ? 'right' : 'left');
  const M = 96;
  const box: React.CSSProperties = { position: 'absolute', width: c.width ?? 900, textAlign: align };
  if (pos === 'tl') Object.assign(box, { left: c.x ?? M, top: c.y ?? 84 });
  if (pos === 'bl') Object.assign(box, { left: c.x ?? M, bottom: c.y ?? 88 });
  if (pos === 'tr') Object.assign(box, { right: c.x ?? M, top: c.y ?? 84 });
  if (pos === 'br') Object.assign(box, { right: c.x ?? M, bottom: c.y ?? 88 });
  if (pos === 'left') Object.assign(box, { left: c.x ?? M, top: '50%', transform: 'translateY(-50%)' });
  if (pos === 'right') Object.assign(box, { right: c.x ?? M, top: '50%', transform: 'translateY(-50%)' });
  if (pos === 'center') Object.assign(box, { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' });
  if (pos === 'top') Object.assign(box, { left: '50%', top: c.y ?? 84, transform: 'translateX(-50%)' });
  if (pos === 'bottom') Object.assign(box, { left: '50%', bottom: c.y ?? 88, transform: 'translateX(-50%)' });
  const scrim: Record<CaptionPos, string> = {
    tl: 'radial-gradient(85% 75% at 0% 0%, rgba(4,4,6,0.94) 0%, rgba(4,4,6,0.7) 38%, rgba(4,4,6,0) 70%)',
    bl: 'radial-gradient(85% 75% at 0% 100%, rgba(4,4,6,0.94) 0%, rgba(4,4,6,0.7) 38%, rgba(4,4,6,0) 70%)',
    tr: 'radial-gradient(120% 90% at 100% 0%, rgba(4,4,6,0.92) 0%, rgba(4,4,6,0.55) 35%, rgba(4,4,6,0) 62%)',
    br: 'radial-gradient(120% 90% at 100% 100%, rgba(4,4,6,0.92) 0%, rgba(4,4,6,0.55) 35%, rgba(4,4,6,0) 62%)',
    left: 'linear-gradient(90deg, rgba(4,4,6,0.9) 0%, rgba(4,4,6,0.6) 30%, rgba(4,4,6,0) 58%)',
    right: 'linear-gradient(270deg, rgba(4,4,6,0.9) 0%, rgba(4,4,6,0.6) 30%, rgba(4,4,6,0) 58%)',
    center: 'radial-gradient(60% 55% at 50% 50%, rgba(4,4,6,0.85) 0%, rgba(4,4,6,0.55) 55%, rgba(4,4,6,0.25) 100%)',
    top: 'linear-gradient(180deg, rgba(4,4,6,0.9) 0%, rgba(4,4,6,0.5) 22%, rgba(4,4,6,0) 42%)',
    bottom: 'linear-gradient(0deg, rgba(4,4,6,0.9) 0%, rgba(4,4,6,0.5) 22%, rgba(4,4,6,0) 42%)',
  };
  const stagger = Math.min(0.06, 0.5 / Math.max(1, words.length));
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: scrim[pos], opacity: scrimO, pointerEvents: 'none' }} />
      <div style={{ ...box, opacity: 1 - exit, marginTop: -16 * exit }}>
        {c.step ? (
          <div style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: 10, marginBottom: size * 0.36, opacity: clamp((t - c.at) / 0.3) }}>
            {Array.from({ length: c.steps ?? 3 }, (_, i) => {
              const cur = i + 1 === c.step, done = i + 1 < c.step!;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 16px 7px 8px', borderRadius: 999, background: cur ? '#ff5c5c' : 'rgba(255,255,255,0.08)', border: cur ? 'none' : '1px solid rgba(255,255,255,0.14)', fontFamily: interTight, fontSize: size * 0.36, fontWeight: 700, color: cur ? '#fff' : done ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)' }}>
                  <span style={{ width: size * 0.5, height: size * 0.5, borderRadius: '50%', display: 'grid', placeItems: 'center', background: cur ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.1)', fontSize: size * 0.3 }}>{done ? '✓' : i + 1}</span>
                  {['Download', 'Load it in Chrome', 'Add a free key'][i]}
                </div>
              );
            })}
          </div>
        ) : null}
        <div style={{ fontFamily: interTight, fontWeight: 700, fontSize: size, lineHeight: 1.06, letterSpacing: '-0.028em', color: '#fff', textShadow: '0 2px 30px rgba(0,0,0,0.35)' }}>
          {words.map((w, i) => <React.Fragment key={i}><Word w={w} i={i} t={t} at={c.at} accent={accent} stagger={stagger} />{i < words.length - 1 ? ' ' : ''}</React.Fragment>)}
        </div>
        {c.sub ? (
          <div style={{ marginTop: size * 0.32, fontFamily: interTight, fontWeight: 500, fontSize: size * 0.42, lineHeight: 1.3, color: 'rgba(255,255,255,0.68)', letterSpacing: '-0.01em', opacity: clamp((t - c.at - 0.35) / 0.4), transform: `translateY(${lerp(10, 0, ease.outCubic(clamp((t - c.at - 0.35) / 0.6)))}px)` }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              {c.sub}
              {c.strike ? <span style={{ position: 'absolute', left: -4, top: '54%', height: Math.max(3, size * 0.05), borderRadius: 3, background: accent, width: `calc(${ease.outExpo(clamp((t - c.at - 0.9) / 0.45)) * 100}% + 8px)`, boxShadow: `0 0 12px ${accent}` }} /> : null}
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
};
