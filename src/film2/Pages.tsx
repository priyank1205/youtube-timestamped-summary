// The second film's typographic pages and its column captions: everything set on
// the sheet itself rather than inside the frame.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { T } from '../film/T';
import { clamp, ease, lerp, springAt } from '../lib/time';
import { SANS, SERIF, Kicker, Lines, usePal } from './style';
import type { Col } from './script';
import { SECTIONS } from './script';

// ── Column captions (beside the frame) ───────────────────────────────────────────────
export const Column: React.FC<{ c: Col; t: number }> = ({ c, t }) => {
  const C = usePal();
  if (t < c.at - 0.05 || t > c.out + 0.6) return null;
  const size = c.size ?? 84;
  const right = c.side === 'right';
  const x = right ? 1290 : 112, w = 560;
  const bodyP = ease.outQuart(clamp((t - c.at - 0.35 - c.head.length * 0.09) / 0.8));
  const exit = clamp((t - c.out) / 0.45);
  const strikeP = ease.inOutCubic(clamp((t - c.at - 1.0) / 0.45));
  return (
    <div style={{ position: 'absolute', left: x, top: 540, width: w, transform: 'translateY(-50%)' }}>
      {c.step ? (
        <div style={{ fontFamily: SERIF, fontSize: 210, lineHeight: 0.8, color: C.red, marginBottom: 26, opacity: clamp((t - c.at) / 0.4) * (1 - exit), transform: `translateY(${lerp(30, 0, ease.outQuart(clamp((t - c.at) / 0.8)))}px)` }}>{c.step}</div>
      ) : null}
      {c.kicker ? <div style={{ marginBottom: 26 }}><Kicker t={t} at={c.at} out={c.out} num={c.num} label={c.kicker} /></div> : null}
      <Lines t={t} at={c.at + 0.08} out={c.out} lines={c.head} size={size} lh={0.98} />
      {c.body ? (
        <div style={{ marginTop: 30, fontFamily: SANS, fontSize: 24, lineHeight: 1.45, color: C.ink2, maxWidth: 545, opacity: bodyP * (1 - exit), transform: `translateY(${lerp(14, 0, bodyP)}px)` }}>{c.body}</div>
      ) : null}
      {c.strike ? (
        <div style={{ position: 'relative', display: 'inline-block', marginTop: 30, fontFamily: SERIF, fontStyle: 'italic', fontSize: 46, color: C.ink2, opacity: bodyP * (1 - exit) }}>
          {c.strike}
          <svg style={{ position: 'absolute', left: -6, top: '52%', overflow: 'visible' }} width="10" height="10">
            <path d="M0,2 C140,-4 300,6 470,-2" fill="none" stroke={C.redInk} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - strikeP} />
          </svg>
        </div>
      ) : null}
    </div>
  );
};

// ── Running header and folio ───────────────────────────────────────────────────────
export const Furniture: React.FC<{ t: number; opacity: number }> = ({ t, opacity }) => {
  const C = usePal();
  let label = SECTIONS[0][1];
  let since = 0;
  for (const [at, l] of SECTIONS) if (t >= at) { label = l; since = at; }
  const swap = clamp((t - since) / 0.5);
  return (
    <div style={{ position: 'absolute', left: 112, right: 112, top: 30, height: 20, display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 13, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.ink3, opacity }}>
      <span>Timestamped Summary — a short film</span>
      <span style={{ opacity: swap }}>{label}</span>
    </div>
  );
};

// ── I · The question ─────────────────────────────────────────────────────────────
export const Question: React.FC<{ t: number }> = ({ t }) => {
  if (t < T.question - 0.1 || t > T.revealIn + 0.6) return null;
  return (
    <AbsoluteFill style={{ display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <Lines t={t} at={T.question + 0.4} out={T.revealIn - 0.35} lines={['What if you could', '*read* it first?']} size={156} lh={0.98} align="center" stagger={0.14} />
      </div>
    </AbsoluteFill>
  );
};

// The extension's icon, flat, the way it would be printed: a stamp on the page.
export const Stamp: React.FC<{ size: number; draw?: number }> = ({ size, draw = 1 }) => {
  const bars: Array<[number, number, number]> = [[29, 29, 70], [38.5, 57.5, 51], [29, 86.5, 70]];
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id="stamp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f20434" /><stop offset="0.5" stopColor="#c90c31" /><stop offset="1" stopColor="#5a1520" /></linearGradient>
      </defs>
      <rect x="0" y="0" width="128" height="128" rx="28" fill="url(#stamp-bg)" />
      <rect x="0.5" y="0.5" width="127" height="127" rx="27.5" fill="none" stroke="rgba(255,255,255,0.25)" />
      {bars.map(([x, y, w], i) => <rect key={i} x={x} y={y} width={Math.max(0.001, w * clamp(draw * 3 - i))} height="9" rx="4.5" fill="#fff" opacity={0.96} />)}
    </svg>
  );
};

// "Read the video before you watch it.", with the red pen under "before".
export const Tagline: React.FC<{ size: number; underline: number; style?: React.CSSProperties }> = ({ size, underline, style }) => {
  const C = usePal();
  const w = size * 3.35;
  return (
    <div style={{ fontFamily: SANS, fontSize: size, color: C.ink2, letterSpacing: '-0.005em', ...style }}>
      Read the video <span style={{ position: 'relative', color: C.ink, fontWeight: 600 }}>before
        <svg style={{ position: 'absolute', left: -size * 0.12, bottom: -size * 0.4, overflow: 'visible' }} width="10" height="10">
          <path d={`M0,4 C${w * 0.3},9 ${w * 0.68},0 ${w},5`} fill="none" stroke={C.redInk} strokeWidth={size * 0.105} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - underline} />
        </svg>
      </span> you watch it.
    </div>
  );
};

// ── II · The answer ──────────────────────────────────────────────────────────────
export const Answer: React.FC<{ t: number }> = ({ t }) => {
  const C = usePal();
  if (t < T.revealIn - 0.1 || t > T.demoIn + 0.5) return null;
  const local = t - T.drop;
  const s = springAt(local, { stiffness: 170, damping: 15 });
  const ring = clamp(local / 0.9);
  const out = ease.inCubic(clamp((t - T.revealOut) / 0.45));
  const underline = ease.inOutCubic(clamp((t - (T.tagline + 0.75)) / 0.5));
  const tag = ease.outQuart(clamp((t - T.tagline) / 0.8));
  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-20 * out}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -24 }}>
        <div style={{ position: 'relative', width: 140, height: 140, opacity: clamp(local / 0.12), transform: `scale(${lerp(1.35, 1, Math.min(1, s))}) rotate(${lerp(-8, 0, Math.min(1, s))}deg)`, filter: C.stampShadow }}>
          <Stamp size={140} draw={clamp((local - 0.15) / 0.55)} />
          <div style={{ position: 'absolute', left: 70 - 70 * (1 + ring * 0.9), top: 70 - 70 * (1 + ring * 0.9), width: 140 * (1 + ring * 0.9), height: 140 * (1 + ring * 0.9), borderRadius: '50%', border: `2px solid ${C.red}`, opacity: 0.5 * (1 - ring) * (local > 0 ? 1 : 0) }} />
        </div>
        <div style={{ marginTop: 52, textAlign: 'center' }}>
          <Lines t={t} at={T.wordmark} lines={['Timestamped Summary']} size={168} lh={0.9} align="center" />
        </div>
        <div style={{ marginTop: 30, textAlign: 'center' }}>
          <Lines t={t} at={T.wordmark + 0.2} lines={['*for YouTube*']} size={76} lh={1} align="center" accent={C.ink2} />
        </div>
        <Tagline size={31} underline={underline} style={{ marginTop: 48, opacity: clamp((t - T.tagline) / 0.5), transform: `translateY(${lerp(12, 0, tag)}px)` }} />
      </div>
    </AbsoluteFill>
  );
};

// ── V · The small print ──────────────────────────────────────────────────────────
export const SmallPrint: React.FC<{ t: number }> = ({ t }) => {
  const C = usePal();
  if (t < T.trustIn + 0.1 || t > T.trustOut + 0.6) return null;
  const rows: Array<{ at: number; head: string; sub: string }> = [
    { at: T.trust1, head: 'No server. No account. *No tracking.*', sub: 'It talks to your AI provider directly — nothing in between.' },
    { at: T.trust2, head: 'Your API key *stays in your browser.*', sub: 'The panel on YouTube can’t even read it.' },
    { at: T.trust3, head: 'Every timestamp is *checked.*', sub: 'Against the video’s real transcript, before it’s shown.' },
  ];
  const out = clamp((t - (T.trustOut - 0.4)) / 0.45);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <div style={{ position: 'absolute', left: 190, top: 168 }}><Kicker t={t} at={T.trustIn + 0.4} label="The small print, in large print" /></div>
      {rows.map((r, i) => {
        const y = 236 + i * 238;
        const p = ease.outQuart(clamp((t - r.at) / 0.8));
        const rule = ease.inOutCubic(clamp((t - r.at + 0.15) / 0.7));
        return (
          <div key={i} style={{ position: 'absolute', left: 190, top: y, width: 1540 }}>
            <div style={{ height: 1, background: C.rule, width: `${rule * 100}%` }} />
            <div style={{ display: 'flex', gap: 56, marginTop: 34 }}>
              <div style={{ fontFamily: SERIF, fontSize: 132, lineHeight: 0.78, color: C.red, width: 80, opacity: clamp((t - r.at) / 0.35) }}>{i + 1}</div>
              <div>
                <Lines t={t} at={r.at + 0.06} lines={[r.head]} size={88} lh={1} />
                <div style={{ marginTop: 16, fontFamily: SANS, fontSize: 27, color: C.ink2, opacity: p, transform: `translateY(${lerp(10, 0, p)}px)` }}>{r.sub}</div>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── VI · Install, in three steps ─────────────────────────────────────────────────────
export const ThreeSteps: React.FC<{ t: number }> = ({ t }) => {
  const C = usePal();
  if (t < T.trustOut - 0.2 || t > T.step1 + 0.5) return null;
  const at = T.installIn - 0.1;
  const out = clamp((t - (T.step1 - 0.25)) / 0.45);
  const steps = ['Download', 'Load it in Chrome', 'Add a free key'];
  return (
    <AbsoluteFill style={{ display: 'grid', placeItems: 'center', opacity: 1 - out }}>
      <div style={{ textAlign: 'center' }}>
        <Lines t={t} at={at} lines={['Install it in', '*three* steps.']} size={150} lh={0.98} align="center" stagger={0.12} />
        <div style={{ marginTop: 46, display: 'flex', gap: 34, justifyContent: 'center', fontFamily: SANS, fontSize: 18, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.ink2 }}>
          {steps.map((s, i) => (
            <span key={s} style={{ opacity: clamp((t - at - 0.45 - i * 0.12) / 0.35) }}><span style={{ color: C.red, marginRight: 12 }}>{i + 1}</span>{s}</span>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── VII · Back to the video: the closing line, on a paper band ───────────────────────
export const Closing: React.FC<{ t: number }> = ({ t }) => {
  const C = usePal();
  if (t < T.capClosing - 0.1 || t > T.endCard + 0.2) return null;
  const inP = ease.outQuart(clamp((t - T.capClosing) / 0.7));
  const out = clamp((t - (T.endCard - 0.5)) / 0.4);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, opacity: 1 - out }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(${C.paperRGB},0) 0%, rgba(${C.paperRGB},${0.94 * inP}) 46%, rgba(${C.paperRGB},${0.97 * inP}) 100%)` }} />
      <div style={{ position: 'absolute', left: 112, bottom: 78 }}>
        <Lines t={t} at={T.capClosing + 0.1} lines={['An hour-long video shouldn’t need', '*an hour* to evaluate.']} size={72} lh={1.02} stagger={0.12} />
      </div>
    </div>
  );
};

// ── Fin ──────────────────────────────────────────────────────────────────────────────
const GitHubMark: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" style={{ display: 'block', flexShrink: 0 }}><path fill={color} d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
);

// The end page: one centred column with a steady rhythm — the stamp, the name,
// the line, then the one thing to do next, set as a solid ink button so it reads
// from across the room.
export const Fin: React.FC<{ t: number }> = ({ t }) => {
  const C = usePal();
  const E = T.endCard;
  if (t < E - 0.2) return null;
  const local = t - E;
  const s = Math.min(1, Math.max(0, springAt(local - 0.1, { stiffness: 150, damping: 16 })));
  const fadeOut = clamp((t - (T.end - 0.9)) / 0.9);
  const rise = (at: number, d = 14) => { const p = ease.outQuart(clamp((local - at) / 0.8)); return { opacity: clamp((local - at) / 0.4), transform: `translateY(${lerp(d, 0, p)}px)` }; };
  const underline = ease.inOutCubic(clamp((local - 1.45) / 0.5));
  const cta = ease.outQuart(clamp((local - 1.1) / 0.9));
  const sheen = clamp((local - 2.6) / 1.2);
  return (
    <AbsoluteFill style={{ opacity: 1 - fadeOut, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -10, transform: `scale(${1 + 0.012 * clamp(local / 8)})` }}>
        <div style={{ opacity: clamp((local - 0.1) / 0.2), transform: `scale(${lerp(1.3, 1, s)}) rotate(${lerp(-7, 0, s)}deg)`, filter: C.stampShadow }}>
          <Stamp size={112} draw={clamp((local - 0.25) / 0.55)} />
        </div>
        <div style={{ marginTop: 46, textAlign: 'center' }}>
          <Lines t={t} at={E + 0.35} lines={['Timestamped Summary']} size={140} lh={0.9} align="center" />
        </div>
        <div style={{ marginTop: 26, textAlign: 'center' }}>
          <Lines t={t} at={E + 0.55} lines={['*for YouTube*']} size={64} lh={1} align="center" accent={C.ink2} />
        </div>
        <Tagline size={29} underline={underline} style={{ marginTop: 40, ...rise(0.85) }} />
        <div style={{ marginTop: 72, opacity: clamp((local - 1.1) / 0.45), transform: `translateY(${lerp(18, 0, cta)}px) scale(${lerp(0.97, 1, cta)})` }}>
          <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 18, padding: '22px 32px 22px 28px', borderRadius: 999, background: C.cta, boxShadow: C.ctaShadow, fontFamily: SANS, fontSize: 33, letterSpacing: '-0.012em', whiteSpace: 'nowrap' }}>
            <GitHubMark size={36} color={C.ctaText} />
            <span><span style={{ color: C.ctaSub, fontWeight: 500 }}>github.com/priyank1205/</span><span style={{ color: C.ctaText, fontWeight: 600 }}>youtube-timestamped-summary</span></span>
            <svg width="32" height="32" viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0, marginLeft: 2 }}><path d="M7 17L17 7M8.5 7H17v8.5" fill="none" stroke={C.ctaArrow} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" /></svg>
            {sheen > 0 && sheen < 1 ? <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${lerp(-25, 115, ease.inOutCubic(sheen))}%`, width: '18%', background: 'linear-gradient(100deg, rgba(255,255,255,0), rgba(255,255,255,0.14), rgba(255,255,255,0))' }} /> : null}
          </div>
        </div>
        <div style={{ marginTop: 30, fontFamily: SANS, fontSize: 15, fontWeight: 600, letterSpacing: '0.26em', textTransform: 'uppercase', color: C.ink3, ...rise(1.5, 10) }}>
          Free &amp; open source&nbsp;&nbsp;·&nbsp;&nbsp;MIT&nbsp;&nbsp;·&nbsp;&nbsp;Chrome, Edge, Brave, Arc
        </div>
      </div>
    </AbsoluteFill>
  );
};
