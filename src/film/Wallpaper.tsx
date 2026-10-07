// The desk the browser window floats over: near-black with slow, soft colour
// fields in the brand's crimson and a cool violet, plus fine grain so large
// gradients never band.
import React from 'react';
import { AbsoluteFill } from 'remotion';

export const Wallpaper: React.FC<{ t: number; tint?: number }> = ({ t, tint = 1 }) => {
  const a = Math.sin(t * 0.21) * 4, b = Math.cos(t * 0.17) * 5;
  return (
    <AbsoluteFill style={{ background: '#08080b', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: '-20%', opacity: 0.9 * tint,
        background: `radial-gradient(40% 45% at ${18 + a}% ${82 + b}%, rgba(214, 22, 58, 0.30), rgba(214,22,58,0) 70%),
                     radial-gradient(38% 42% at ${86 - b}% ${16 + a}%, rgba(98, 76, 214, 0.22), rgba(98,76,214,0) 70%),
                     radial-gradient(60% 60% at 50% 50%, rgba(255,255,255,0.03), rgba(255,255,255,0) 70%)` }} />
      <Grain t={t} />
    </AbsoluteFill>
  );
};

// SVG fractal noise, re-seeded every couple of frames.
export const Grain: React.FC<{ t: number; opacity?: number }> = ({ t, opacity = 0.06 }) => {
  const seed = Math.floor(t * 30) % 97;
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity, mixBlendMode: 'overlay', pointerEvents: 'none' }}>
      <filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={seed} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="100%" height="100%" filter={`url(#g${seed})`} />
    </svg>
  );
};
