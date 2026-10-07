// The end card, and the pieces the poster shares with it: the icon as a lit,
// glassy object, a slow field of timestamps drifting in depth behind it, and
// the lockup. Everything is a pure function of t.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { T } from './T';
import { clamp, ease, lerp, rand, springAt } from '../lib/time';
import { interTight, inter } from '../lib/fonts';
import { Grain } from './Wallpaper';

// ── The icon, lit ───────────────────────────────────────────────────────────────
// Same geometry and colours as icons/icon128.png (see ui/Logo.tsx), with a soft
// top light, a rim, contact shadow and an optional specular sweep (0..1).
export const GlassIcon: React.FC<{ size: number; draw?: [number, number, number]; sweep?: number; glow?: number; id: string }> = ({ size, draw = [1, 1, 1], sweep = -1, glow = 1, id }) => {
  const bars: Array<[number, number, number]> = [[29, 29, 70], [38.5, 57.5, 51], [29, 86.5, 70]];
  const sx = lerp(-90, 190, clamp(sweep));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* bloom and contact shadow */}
      <div style={{ position: 'absolute', left: '-60%', top: '-45%', width: '220%', height: '220%', borderRadius: '50%', background: `radial-gradient(closest-side, rgba(235,24,64,${0.42 * glow}), rgba(150,10,40,${0.16 * glow}) 45%, rgba(0,0,0,0) 72%)`, filter: 'blur(6px)' }} />
      <div style={{ position: 'absolute', left: '8%', top: '88%', width: '84%', height: '18%', borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.75), rgba(0,0,0,0))', filter: 'blur(8px)' }} />
      <svg width={size} height={size} viewBox="0 0 128 128" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff1a47" />
            <stop offset="0.45" stopColor="#c90c31" />
            <stop offset="1" stopColor="#4a141c" />
          </linearGradient>
          <radialGradient id={`${id}-top`} cx="0.3" cy="0.05" r="0.85">
            <stop offset="0" stopColor="#fff" stopOpacity="0.42" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.06" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.55" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0.12" />
            <stop offset="0.7" stopColor="#fff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id={`${id}-bar`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.62" />
          </linearGradient>
          <linearGradient id={`${id}-spec`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${id}-clip`}><rect x="0" y="0" width="128" height="128" rx="28" /></clipPath>
          <filter id={`${id}-barsh`} x="-20%" y="-50%" width="140%" height="220%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" floodColor="#4a0010" floodOpacity="0.45" /></filter>
        </defs>
        <rect x="0" y="0" width="128" height="128" rx="28" fill={`url(#${id}-bg)`} />
        <rect x="0" y="0" width="128" height="128" rx="28" fill={`url(#${id}-top)`} />
        <rect x="0" y="0" width="128" height="128" rx="28" fill={`url(#${id}-shade)`} />
        <g filter={`url(#${id}-barsh)`}>
          {bars.map(([x, y, w], i) => <rect key={i} x={x} y={y} width={Math.max(0.001, w * draw[i])} height="9" rx="4.5" fill={`url(#${id}-bar)`} />)}
        </g>
        {sweep >= 0 && sweep <= 1 ? (
          <g clipPath={`url(#${id}-clip)`}>
            <rect x={sx} y="-40" width="46" height="210" fill={`url(#${id}-spec)`} transform="rotate(24 64 64)" style={{ mixBlendMode: 'screen' }} />
          </g>
        ) : null}
        <rect x="0.5" y="0.5" width="127" height="127" rx="27.5" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1" />
      </svg>
    </div>
  );
};

// ── Timestamps drifting in depth ──────────────────────────────────────────────────
const STAMPS = ['0:54', '3:21', '7:48', '12:07', '18:30', '27:45', '33:12', '41:10', '49:26', '58:02', '1:03:05', '1:06:47', '1:09:30',
  '1:12:40', '1:15:22', '1:18:09', '1:24:18', '1:31:55', '1:47:52', '1:58:40', '2:05:33', '2:14:09', '2:31:07', '2:44:50'];
type Chip = { a: number; r: number; z: number; s: string; hot: boolean };
const CHIPS: Chip[] = Array.from({ length: 30 }, (_, i) => ({
  a: rand(i * 7 + 1) * Math.PI * 2,
  r: 0.62 + rand(i * 7 + 2) * 0.5,
  z: 900 + rand(i * 7 + 3) * 1700,
  s: STAMPS[(i * 5) % STAMPS.length],
  hot: i % 9 === 4,
}));

// Chips sit on a wide ring around the lockup and drift slowly toward the
// viewer; they fade out near the centre so the type always reads cleanly.
export const TimestampField: React.FC<{ t: number; t0: number; opacity?: number; cx?: number; cy?: number; speed?: number }> = ({ t, t0, opacity = 1, cx = 960, cy = 540, speed = 110 }) => {
  const F = 1500, FOCUS = 1500, SPAN = 1700, Z0 = 900;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      {CHIPS.map((c, i) => {
        const z = ((c.z - Z0 - (t - t0) * speed) % SPAN + SPAN) % SPAN + Z0;
        const k = F / z;
        const x = cx + Math.cos(c.a) * c.r * 1150 * k, y = cy + Math.sin(c.a) * c.r * 640 * k;
        const d = Math.hypot((x - cx) / 1.6, y - cy);
        const clear = clamp((d - 250) / 230);
        const edge = clamp(Math.min(x, 1920 - x, y, 1080 - y) / 160);
        const fade = Math.min(clamp((Z0 + SPAN - z) / 420), clamp((z - Z0) / 260)) * clear * edge;
        const blur = 1.2 + Math.min(6, Math.abs(z - FOCUS) / 260);
        const fs = 24 * k;
        if (fade <= 0.01) return null;
        return (
          <div key={i} style={{
            position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', padding: `${0.3 * fs}px ${0.6 * fs}px`, borderRadius: fs * 0.5,
            fontFamily: inter, fontWeight: 600, fontSize: fs, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            color: c.hot ? 'rgba(255,160,170,0.95)' : 'rgba(255,255,255,0.8)',
            background: c.hot ? 'rgba(255,60,85,0.18)' : 'rgba(255,255,255,0.06)',
            boxShadow: `inset 0 0 0 ${Math.max(0.6, k)}px ${c.hot ? 'rgba(255,90,110,0.55)' : 'rgba(255,255,255,0.14)'}`,
            opacity: fade * (c.hot ? 0.7 : 0.4), filter: `blur(${blur.toFixed(2)}px)`,
          }}>{c.s}</div>
        );
      })}
    </AbsoluteFill>
  );
};

// The stage: near-black, a soft top light, the brand's crimson bloom low behind
// the icon and a cool violet far off to one side.
export const Stage: React.FC<{ t: number; bloom?: number; cy?: number }> = ({ t, bloom = 1, cy = 36 }) => {
  const d = Math.sin(t * 0.25) * 2;
  return (
    <AbsoluteFill style={{ background: '#040406' }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 50% at 50% -8%, rgba(255,255,255,0.075), rgba(255,255,255,0) 70%)` }} />
      <AbsoluteFill style={{ opacity: bloom, background: `radial-gradient(42% 46% at ${50 + d}% ${cy}%, rgba(214,18,56,0.30), rgba(120,8,36,0.12) 45%, rgba(4,4,6,0) 75%)` }} />
      <AbsoluteFill style={{ opacity: bloom, background: `radial-gradient(36% 40% at ${88 - d}% ${78 + d}%, rgba(92,70,210,0.14), rgba(92,70,210,0) 70%)` }} />
    </AbsoluteFill>
  );
};

const GitHubMark: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 16 16"><path fill="#fff" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
);

// Text that resolves from a soft blur as it rises — the lockup's entrance.
const Resolve: React.FC<{ t: number; at: number; dur?: number; dy?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ t, at, dur = 0.9, dy = 18, children, style }) => {
  const p = ease.outQuart(clamp((t - at) / dur));
  return <div style={{ transform: `translateY(${lerp(dy, 0, p)}px)`, opacity: clamp((t - at) / (dur * 0.6)), filter: p < 0.98 ? `blur(${lerp(10, 0, p).toFixed(2)}px)` : undefined, ...style }}>{children}</div>;
};

// ── The lockup (shared by the end card and the poster) ─────────────────────────────
export const Lockup: React.FC<{ t: number; at: number; scale?: number; cta?: boolean }> = ({ t, at, scale = 1, cta = true }) => {
  const local = t - at;
  const s = springAt(local, { stiffness: 120, damping: 17 });
  const draw = [0, 1, 2].map((i) => ease.outExpo(clamp((local - 0.25 - i * 0.09) / 0.6))) as [number, number, number];
  const tilt = 1 - Math.min(1, s);
  const shimmer = clamp((t - (at + 3.3)) / 1.1);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: interTight, transform: `scale(${scale})`, transformOrigin: '50% 0' }}>
      <div style={{ perspective: 900, opacity: clamp(local / 0.25) }}>
        <div style={{ transform: `translateY(${lerp(40, 0, Math.min(1, s))}px) rotateX(${(28 * tilt).toFixed(2)}deg) scale(${lerp(0.72, 1, s)})` }}>
          <GlassIcon size={176} draw={draw} sweep={clamp((t - (at + 2.2)) / 1.0)} id="end" />
        </div>
      </div>
      <Resolve t={t} at={at + 0.5} style={{ marginTop: 56, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 92, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1, background: 'linear-gradient(180deg, #ffffff 30%, rgba(255,255,255,0.78))', WebkitBackgroundClip: 'text', color: 'transparent' }}>Timestamped Summary</span>
        <span style={{ fontSize: 92, fontWeight: 500, letterSpacing: '-0.045em', lineHeight: 1, color: 'rgba(255,255,255,0.42)' }}> for YouTube</span>
      </Resolve>
      <Resolve t={t} at={at + 0.85} style={{ marginTop: 26, fontSize: 40, fontWeight: 500, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.72)' }}>
        Read the video <span style={{ color: '#ff5c6c', fontWeight: 600 }}>before</span> you watch it.
      </Resolve>
      {cta ? (
        <>
          <Resolve t={t} at={at + 1.25} style={{ marginTop: 64 }}>
            <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 16, padding: '17px 30px 17px 24px', borderRadius: 999, background: 'linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.035))', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.18), 0 18px 50px rgba(0,0,0,0.5)' }}>
              <GitHubMark size={30} />
              <span style={{ fontFamily: inter, fontSize: 29, fontWeight: 500, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>github.com/priyank1205/<span style={{ color: '#fff', fontWeight: 600 }}>youtube-timestamped-summary</span></span>
              {shimmer > 0 && shimmer < 1 ? <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${lerp(-30, 120, ease.inOutCubic(shimmer))}%`, width: '22%', background: 'linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.16), rgba(255,255,255,0))' }} /> : null}
            </div>
          </Resolve>
          <Resolve t={t} at={at + 1.55} style={{ marginTop: 30, fontFamily: inter, fontSize: 17, fontWeight: 600, letterSpacing: '0.26em', color: 'rgba(255,255,255,0.42)' }}>
            FREE &amp; OPEN SOURCE&nbsp;&nbsp;·&nbsp;&nbsp;MIT&nbsp;&nbsp;·&nbsp;&nbsp;CHROME · EDGE · BRAVE · ARC
          </Resolve>
        </>
      ) : null}
    </div>
  );
};

// ── Act 7 · End card ───────────────────────────────────────────────────────────────
// An anamorphic streak carries the last product shot into the dark; the icon
// tilts up out of the light, the lockup resolves, the timestamps drift past.
export const Streak: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const p = clamp((t - at) / 0.75);
  if (p <= 0 || p >= 1) return null;
  const w = ease.outCubic(clamp(p / 0.45));
  const o = Math.sin(Math.PI * p) ** 0.8;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', mixBlendMode: 'screen' }}>
      <div style={{ position: 'absolute', left: 960 - 1100 * w, top: 538, width: 2200 * w, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, rgba(255,70,90,0), rgba(255,200,205,0.95) 40%, #fff 50%, rgba(255,200,205,0.95) 60%, rgba(255,70,90,0))', opacity: o, filter: 'blur(0.6px)' }} />
      <div style={{ position: 'absolute', left: 960 - 1200 * w, top: 470, width: 2400 * w, height: 140, background: 'radial-gradient(50% 50% at 50% 50%, rgba(255,40,80,0.55), rgba(255,40,80,0) 70%)', opacity: o, filter: 'blur(10px)' }} />
    </AbsoluteFill>
  );
};

export const EndCard: React.FC<{ t: number }> = ({ t }) => {
  const E = T.endCard;
  if (t < E - 0.35) return null;
  const inP = ease.inOutCubic(clamp((t - (E - 0.35)) / 0.45));
  const fadeOut = clamp((t - (T.end - 0.9)) / 0.9);
  const push = 1 + 0.025 * ease.inOutCubic(clamp((t - E) / 8));
  return (
    <AbsoluteFill style={{ opacity: inP * (1 - fadeOut) }}>
      <Stage t={t} bloom={clamp((t - E) / 1.2)} />
      <TimestampField t={t} t0={E - 2} opacity={ease.inOutCubic(clamp((t - E - 0.4) / 1.6))} cy={540} />
      <AbsoluteFill style={{ background: 'radial-gradient(38% 46% at 50% 47%, rgba(4,4,6,0.86), rgba(4,4,6,0) 100%)' }} />
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 232 }}>
          <Lockup t={t} at={E} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(120% 110% at 50% 50%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)' }} />
      <Grain t={t} opacity={0.06} />
    </AbsoluteFill>
  );
};
