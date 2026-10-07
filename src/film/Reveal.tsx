// The title reveal on the drop: the icon springs in and writes its three lines,
// the wordmark slides out from behind it, then the README's own tagline.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { T } from './T';
import { clamp, ease, lerp, springAt } from '../lib/time';
import { LogoMark } from '../ui/Logo';
import { interTight } from '../lib/fonts';
import { Grain } from './Wallpaper';

export const Reveal: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.revealIn || t > T.demoIn + 0.3) return null;
  const bloom = ease.outCubic(clamp((t - T.revealIn) / 0.32));
  const out = ease.inOutCubic(clamp((t - T.revealOut) / (T.demoIn + 0.3 - T.revealOut)));
  const local = t - T.drop;
  const s = springAt(local, { stiffness: 210, damping: 15 });
  const draw = [0, 1, 2].map((i) => ease.outExpo(clamp((local - 0.14 - i * 0.08) / 0.5))) as [number, number, number];
  const slide = ease.inOutCubic(clamp((t - T.wordmark) / 0.65));
  const wm = ease.outExpo(clamp((t - T.wordmark - 0.12) / 0.8));
  const tagWords = 'Read the video before you watch it.'.split(' ');
  const LOGO = 168, GAP = 40, WM_W = 960;
  const groupW = LOGO + GAP + WM_W;
  const logoX = lerp(960 - LOGO / 2, 960 - groupW / 2, slide);
  const sheen = clamp((t - 15.75) / 0.9);
  return (
    <AbsoluteFill style={{ opacity: 1 - out, pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: '#060608', opacity: bloom }} />
      <AbsoluteFill style={{
        opacity: bloom,
        background: `radial-gradient(${lerp(10, 60, bloom)}% ${lerp(10, 70, bloom)}% at 50% 48%, rgba(226,24,62,${lerp(0.9, 0.34, bloom)}) 0%, rgba(120,10,40,0.18) 45%, rgba(6,6,8,0) 75%)`,
      }} />
      <AbsoluteFill style={{ transform: `scale(${1 + 0.05 * out + 0.015 * clamp(local / 3.5)})` }}>
        {/* Icon */}
        <div style={{ position: 'absolute', left: logoX, top: 540 - LOGO / 2 - 40, width: LOGO, height: LOGO, transform: `scale(${0.35 + 0.65 * s}) rotate(${lerp(-14, 0, Math.min(1, s))}deg)`, opacity: clamp(local / 0.12) }}>
          <LogoMark size={LOGO} draw={draw} glow={1} id="reveal" />
        </div>
        {/* Wordmark */}
        <div style={{ position: 'absolute', left: logoX + LOGO + GAP, top: 540 - 40 - 82, width: WM_W, height: 170, overflow: 'hidden' }}>
          <div style={{ transform: `translateX(${lerp(-120, 0, wm)}px)`, opacity: wm, fontFamily: interTight }}>
            <div style={{ fontWeight: 800, fontSize: 90, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1.0, whiteSpace: 'nowrap', position: 'relative' }}>
              Timestamped Summary
              <span style={{ position: 'absolute', inset: 0, background: `linear-gradient(100deg, transparent ${lerp(-30, 110, sheen) - 12}%, rgba(255,255,255,0.65) ${lerp(-30, 110, sheen)}%, transparent ${lerp(-30, 110, sheen) + 12}%)`, mixBlendMode: 'overlay', WebkitBackgroundClip: 'text', color: 'transparent' }}>Timestamped Summary</span>
            </div>
            <div style={{ fontWeight: 500, fontSize: 46, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.55)', marginTop: 12 }}>for YouTube</div>
          </div>
        </div>
        {/* Tagline */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 540 + LOGO / 2 + 16, textAlign: 'center', fontFamily: interTight, fontWeight: 600, fontSize: 50, letterSpacing: '-0.025em', color: '#fff' }}>
          {tagWords.map((w, i) => {
            const p = ease.outExpo(clamp((t - T.tagline - i * 0.07) / 0.7));
            return (
              <span key={i} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: 8, marginRight: i < tagWords.length - 1 ? '0.26em' : 0 }}>
                <span style={{ display: 'inline-block', transform: `translateY(${lerp(105, 0, p)}%)`, color: w === 'before' ? '#ff5c5c' : 'rgba(255,255,255,0.86)' }}>{w}</span>
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
      <Grain t={t} opacity={0.08} />
    </AbsoluteFill>
  );
};
