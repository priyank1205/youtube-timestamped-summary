// Full-frame typographic beats: the privacy promise (act 5) and the install
// title (act 6). The end card lives in EndCard.tsx.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { T } from './T';
import { clamp, ease, lerp, springAt } from '../lib/time';
import { interTight } from '../lib/fonts';
import { LogoMark } from '../ui/Logo';
import { Grain } from './Wallpaper';

const Rise: React.FC<{ t: number; at: number; children: React.ReactNode; dy?: number; style?: React.CSSProperties }> = ({ t, at, children, dy = 40, style }) => {
  const p = ease.outExpo(clamp((t - at) / 0.8));
  return <div style={{ transform: `translateY(${lerp(dy, 0, p)}px)`, opacity: clamp((t - at) / 0.3), ...style }}>{children}</div>;
};

const Stage: React.FC<{ t: number; a: number; b: number; children: React.ReactNode; glow?: string }> = ({ t, a, b, children, glow = 'rgba(226,24,62,0.22)' }) => {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const inP = ease.inOutCubic(clamp((t - a) / 0.45));
  const outP = ease.inOutCubic(clamp((t - (b - 0.45)) / 0.45));
  return (
    <AbsoluteFill style={{ opacity: inP * (1 - outP) }}>
      <AbsoluteFill style={{ background: '#07070a' }} />
      <AbsoluteFill style={{ background: `radial-gradient(55% 60% at 50% 55%, ${glow}, rgba(7,7,10,0) 70%)` }} />
      <AbsoluteFill style={{ transform: `scale(${1 + 0.03 * clamp((t - a) / (b - a))})` }}>{children}</AbsoluteFill>
      <Grain t={t} opacity={0.07} />
    </AbsoluteFill>
  );
};

// ── Act 5 · Trust ───────────────────────────────────────────────────────────────
const Icon: React.FC<{ kind: 'server' | 'key' | 'check'; t: number; at: number }> = ({ kind, t, at }) => {
  const s = springAt(t - at, { stiffness: 220, damping: 15 });
  const stroke = '#ff5c5c';
  return (
    <div style={{ width: 92, height: 92, borderRadius: 26, background: 'rgba(255,92,92,0.12)', border: '1px solid rgba(255,92,92,0.35)', display: 'grid', placeItems: 'center', transform: `scale(${Math.max(0, s)})` }}>
      <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === 'server' ? (<><path d="M7 18.5h10.2a4.3 4.3 0 0 0 .9-8.5 6 6 0 0 0-11.4-1.4A5 5 0 0 0 7 18.5z" /><path d="M3.5 3.5l17 17" strokeWidth="2.1" /></>) : null}
        {kind === 'key' ? (<><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 7l2 2M14 9l2 2" /></>) : null}
        {kind === 'check' ? (<><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></>) : null}
      </svg>
    </div>
  );
};

export const Trust: React.FC<{ t: number }> = ({ t }) => {
  const rows: Array<{ at: number; kind: 'server' | 'key' | 'check'; head: string; sub: string }> = [
    { at: T.trust1, kind: 'server', head: 'No server. No account. No tracking.', sub: 'It talks to your AI provider directly — nothing in between.' },
    { at: T.trust2, kind: 'key', head: 'Your API key stays in your browser.', sub: 'The panel on YouTube can’t even read it.' },
    { at: T.trust3, kind: 'check', head: 'Every timestamp is checked.', sub: 'Against the video’s real transcript, before it’s shown.' },
  ];
  return (
    <Stage t={t} a={T.trustIn} b={T.trustOut}>
      <div style={{ position: 'absolute', left: 300, top: 250, display: 'flex', flexDirection: 'column', gap: 64, fontFamily: interTight }}>
        {rows.map((r) => (
          <div key={r.head} style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <Icon kind={r.kind} t={t} at={r.at} />
            <Rise t={t} at={r.at + 0.06}>
              <div style={{ fontSize: 58, fontWeight: 750, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.05 }}>{r.head}</div>
              <div style={{ fontSize: 28, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: 10, letterSpacing: '-0.01em' }}>{r.sub}</div>
            </Rise>
          </div>
        ))}
      </div>
    </Stage>
  );
};

// ── Act 6 · Install title ─────────────────────────────────────────────────────────
export const InstallTitle: React.FC<{ t: number }> = ({ t }) => (
  <Stage t={t} a={T.trustOut - 0.45} b={T.step1 + 0.1} glow="rgba(98,76,214,0.2)">
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: interTight }}>
      <Rise t={t} at={T.installIn - 0.15}><div style={{ fontSize: 96, fontWeight: 800, color: '#fff', letterSpacing: '-0.045em' }}>Install it in <span style={{ color: '#ff5c5c' }}>a few minutes.</span></div></Rise>
      <Rise t={t} at={T.installIn + 0.25}><div style={{ fontSize: 34, fontWeight: 500, color: 'rgba(255,255,255,0.62)', marginTop: 18, letterSpacing: '-0.01em' }}>Free and open source. Works in Chrome, Edge, Brave and Arc.</div></Rise>
    </div>
  </Stage>
);
