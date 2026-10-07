// Dims everything in the window except the thing being demonstrated, through
// soft-edged holes. Purely an editorial device of the film, drawn over the page.
import React from 'react';

export type Hole = [number, number, number, number];

export const Spotlight: React.FC<{ holes: Hole[]; amount: number; id: string; w?: number; h?: number }> = ({ holes, amount, id, w = 1440, h = 896 }) => {
  if (amount <= 0.001) return null;
  return (
    <svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 40 }}>
      <defs>
        <filter id={`${id}-f`} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7" /></filter>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={h}>
          <rect width={w} height={h} fill="white" />
          <g filter={`url(#${id}-f)`}>
            {holes.map(([x, y, hw, hh], i) => <rect key={i} x={x} y={y} width={hw} height={hh} rx="14" fill="black" />)}
          </g>
        </mask>
      </defs>
      <rect width={w} height={h} fill={`rgba(0,0,0,${(0.64 * amount).toFixed(3)})`} mask={`url(#${id}-m)`} />
    </svg>
  );
};

// Interpolate between hole layouts (same count), for smooth re-framing.
export const lerpHoles = (a: Hole[], b: Hole[], k: number): Hole[] =>
  b.map((hb, i) => { const ha = a[i] || a[a.length - 1] || hb; return hb.map((v, j) => ha[j] + (v - ha[j]) * k) as Hole; });
