// The extension's icon, redrawn as vector from icons/icon128.png (same corner
// radius, gradient stops sampled from the PNG, same three bars), so it stays
// sharp at any size. `draw` (0..1 per bar) wipes each bar in from the left.
import React from 'react';

export const LogoMark: React.FC<{ size: number; draw?: [number, number, number]; glow?: number; id?: string }> = ({ size, draw = [1, 1, 1], glow = 0, id = 'lm' }) => {
  const bars: Array<[number, number, number]> = [[29, 29, 70], [38.5, 57.5, 51], [29, 86.5, 70]];
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" style={{ overflow: 'visible', filter: glow ? `drop-shadow(0 ${size * 0.08}px ${size * 0.35}px rgba(232,20,60,${0.55 * glow}))` : undefined }}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f20434" />
          <stop offset="0.48" stopColor="#c00c2f" />
          <stop offset="1" stopColor="#4c1c21" />
        </linearGradient>
        <linearGradient id={`${id}-bar`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.97" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="128" height="128" rx="27" fill={`url(#${id}-bg)`} />
      <rect x="0" y="0" width="128" height="128" rx="27" fill={`url(#${id}-sheen)`} />
      {bars.map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={Math.max(0.001, w * draw[i])} height="9" rx="4.5" fill={`url(#${id}-bar)`} />
      ))}
    </svg>
  );
};
