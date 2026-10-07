// What the (fictional) lecture video shows at a given playback position: a
// slide deck from "Night School — The Science of Sleep". `sec` is the video's
// own clock, so the caffeine chart builds itself as the video plays past 1:12:40,
// exactly like a slide animation in a real recording.
import React from 'react';
import { interTight, inter } from '../lib/fonts';
import { clamp, ease } from '../lib/time';
import { SECTIONS } from '../data/video';

const W = 996, H = 560;
const C = {
  bg1: '#141b31', bg2: '#0a0f1d', ink: '#f4f1ea', dim: '#9aa3b8', faint: '#5d6680',
  violet: '#9d8cff', teal: '#5fd4c4', amber: '#ffc95c', coral: '#ff7a68', grid: 'rgba(255,255,255,0.07)',
};

const sectionIndexAt = (sec: number) => {
  let idx = 0;
  SECTIONS.forEach((s, i) => { if (s.points[0].sec <= sec) idx = i; });
  return idx;
};

const Frame: React.FC<{ children: React.ReactNode; n: number; kicker: string }> = ({ children, n, kicker }) => (
  <div style={{
    position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: inter,
    background: `radial-gradient(120% 90% at 18% 10%, ${C.bg1} 0%, ${C.bg2} 70%)`, color: C.ink,
  }}>
    <div style={{ position: 'absolute', left: 64, top: 52, fontFamily: interTight, fontSize: 13, letterSpacing: '0.22em', color: C.amber, fontWeight: 700 }}>{kicker.toUpperCase()}</div>
    {children}
    <div style={{ position: 'absolute', right: 64, top: 50, fontSize: 12, color: C.faint, letterSpacing: '0.08em', display: 'flex', gap: 8, alignItems: 'center' }}>
      <Moon size={13} /> <span style={{ fontWeight: 600, color: C.dim }}>NIGHT SCHOOL</span><span style={{ fontVariantNumeric: 'tabular-nums', marginLeft: 6 }}>{String(n).padStart(2, '0')}</span>
    </div>
  </div>
);

const Moon: React.FC<{ size: number; glow?: boolean }> = ({ size, glow }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={glow ? { filter: 'drop-shadow(0 0 30px rgba(255,201,92,0.45))' } : undefined}>
    <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" fill={C.amber} />
  </svg>
);

const Title: React.FC<{ children: React.ReactNode; top?: number; size?: number }> = ({ children, top = 82, size = 44 }) => (
  <div style={{ position: 'absolute', left: 64, top, fontFamily: interTight, fontWeight: 700, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.08, maxWidth: 860 }}>{children}</div>
);

// --- Individual slides --------------------------------------------------------------
const TitleSlide: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(90% 90% at 70% 40%, #1d2546 0%, ${C.bg2} 65%)`, overflow: 'hidden', fontFamily: inter, color: C.ink }}>
    {Array.from({ length: 46 }, (_, i) => {
      const x = (Math.sin(i * 91.7) * 0.5 + 0.5) * W, y = (Math.sin(i * 47.3 + 2) * 0.5 + 0.5) * H;
      const r = 0.6 + (Math.sin(i * 13.1) * 0.5 + 0.5) * 1.4;
      return <div key={i} style={{ position: 'absolute', left: x, top: y, width: r * 2, height: r * 2, borderRadius: 9, background: '#fff', opacity: 0.25 + (i % 5) * 0.12 }} />;
    })}
    <div style={{ position: 'absolute', right: 120, top: 120 }}><Moon size={250} glow /></div>
    <div style={{ position: 'absolute', left: 70, top: 168, fontFamily: interTight, fontSize: 15, letterSpacing: '0.26em', color: C.amber, fontWeight: 700 }}>NIGHT SCHOOL · FULL MASTERCLASS</div>
    <div style={{ position: 'absolute', left: 66, top: 198, fontFamily: interTight, fontWeight: 800, fontSize: 76, letterSpacing: '-0.03em', lineHeight: 0.98 }}>The Science<br />of Sleep</div>
    <div style={{ position: 'absolute', left: 70, top: 378, fontSize: 19, color: C.dim }}>Everything we know, and what to do about it</div>
  </div>
);

const ThirdSlide: React.FC<{ n: number }> = ({ n }) => (
  <Frame n={n} kicker="Why we sleep">
    <Title>A third of your life,<br />spent unconscious.</Title>
    <svg style={{ position: 'absolute', right: 120, top: 150 }} width={240} height={240} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="40" fill="none" stroke={C.grid} strokeWidth="12" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={C.violet} strokeWidth="12" strokeDasharray={`${2 * Math.PI * 40 * 0.33} 999`} transform="rotate(-90 50 50)" strokeLinecap="round" />
      <text x="50" y="57" textAnchor="middle" fontFamily={interTight} fontWeight={800} fontSize="21" fill={C.ink}>33%</text>
    </svg>
    <div style={{ position: 'absolute', left: 64, top: 250, width: 470, fontSize: 19, lineHeight: 1.5, color: C.dim }}>
      Every animal studied sleeps — so whatever sleep does is worth being defenseless for.
    </div>
  </Frame>
);

const ClockSlide: React.FC<{ n: number }> = ({ n }) => (
  <Frame n={n} kicker="Your internal clock">
    <Title>Light sets the clock.</Title>
    <svg style={{ position: 'absolute', right: 110, top: 105 }} width={330} height={330} viewBox="-60 -60 120 120">
      <circle r="50" fill="none" stroke={C.grid} strokeWidth="1.2" />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
        return <line key={i} x1={Math.cos(a) * 45} y1={Math.sin(a) * 45} x2={Math.cos(a) * (i % 6 === 0 ? 39 : 42.5)} y2={Math.sin(a) * (i % 6 === 0 ? 39 : 42.5)} stroke={i % 6 === 0 ? C.dim : C.faint} strokeWidth={i % 6 === 0 ? 1.4 : 0.8} />;
      })}
      <path d={arc(50, 6.5, 19)} fill="none" stroke={C.amber} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <path d={arc(50, 21.5, 30.5)} fill="none" stroke={C.violet} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
      <text y="-4" textAnchor="middle" fontFamily={interTight} fontWeight={800} fontSize="15" fill={C.ink}>24 h</text>
      <text y="10" textAnchor="middle" fontFamily={inter} fontSize="6" fill={C.dim}>circadian rhythm</text>
    </svg>
    <div style={{ position: 'absolute', left: 64, top: 180, width: 420, fontSize: 19, lineHeight: 1.55, color: C.dim }}>
      <div><span style={{ color: C.amber }}>●</span> Morning light advances it</div>
      <div><span style={{ color: C.violet }}>●</span> Evening light delays it</div>
      <div style={{ marginTop: 14, fontSize: 16 }}>The master clock re-syncs to light reaching your eyes, every single day.</div>
    </div>
  </Frame>
);
// Arc of a 24h dial from hour a to hour b, radius r.
function arc(r: number, a: number, b: number) {
  const p = (h: number) => { const t = (h / 24) * Math.PI * 2 - Math.PI / 2; return [Math.cos(t) * r, Math.sin(t) * r]; };
  const [x1, y1] = p(a), [x2, y2] = p(b);
  const large = (b - a) % 24 > 12 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

const HypnoSlide: React.FC<{ n: number }> = ({ n }) => {
  // Stage per half-hour from 11 pm: 0 wake, 1 REM, 2 N1, 3 N2, 4 N3
  const stages = [0, 2, 3, 4, 4, 3, 1, 3, 4, 3, 1, 1, 3, 3, 1, 1, 2, 0];
  const x0 = 120, x1 = 900, yTop = 170, yStep = 52;
  const step = (x1 - x0) / (stages.length - 1);
  const d = stages.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x0 + i * step} ${yTop + s * yStep} ${i < stages.length - 1 ? `L ${x0 + (i + 1) * step} ${yTop + s * yStep}` : ''}`).join(' ');
  return (
    <Frame n={n} kicker="The architecture of a night">
      <Title size={38}>Four to six 90-minute cycles.</Title>
      <svg style={{ position: 'absolute', left: 0, top: 0 }} width={W} height={H}>
        {['Wake', 'REM', 'Light', 'Core', 'Deep'].map((l, i) => (
          <g key={l}>
            <line x1={x0} x2={x1} y1={yTop + i * yStep} y2={yTop + i * yStep} stroke={C.grid} />
            <text x={x0 - 14} y={yTop + i * yStep + 4} textAnchor="end" fontSize="12" fill={C.faint} fontFamily={inter}>{l}</text>
          </g>
        ))}
        {stages.map((s, i) => (s === 1 ? <rect key={i} x={x0 + i * step} y={yTop + yStep - 7} width={step} height={14} rx={4} fill={C.violet} opacity={0.75} /> : null))}
        <path d={d} fill="none" stroke={C.teal} strokeWidth={3} strokeLinejoin="round" />
        {['11 pm', '1 am', '3 am', '5 am', '7 am'].map((l, i) => (
          <text key={l} x={x0 + i * ((x1 - x0) / 4)} y={yTop + 4 * yStep + 34} textAnchor="middle" fontSize="12" fill={C.faint} fontFamily={inter}>{l}</text>
        ))}
      </svg>
    </Frame>
  );
};

const BarsSlide: React.FC<{ n: number; kicker: string; title: React.ReactNode; a: [string, number]; b: [string, number]; note: string; color: string }> = ({ n, kicker, title, a, b, note, color }) => (
  <Frame n={n} kicker={kicker}>
    <Title size={40}>{title}</Title>
    {[a, b].map(([label, v], i) => (
      <div key={label} style={{ position: 'absolute', left: 64, top: 230 + i * 86, width: 860 }}>
        <div style={{ fontSize: 16, color: C.dim, marginBottom: 10 }}>{label}</div>
        <div style={{ height: 30, width: 760 * v, borderRadius: 8, background: i === 0 ? color : 'rgba(255,255,255,0.14)' }} />
      </div>
    ))}
    <div style={{ position: 'absolute', left: 64, top: 430, fontSize: 15, color: C.faint }}>{note}</div>
  </Frame>
);

const BigNumberSlide: React.FC<{ n: number; kicker: string; big: string; line: React.ReactNode; color: string }> = ({ n, kicker, big, line, color }) => (
  <Frame n={n} kicker={kicker}>
    <div style={{ position: 'absolute', left: 60, top: 96, fontFamily: interTight, fontWeight: 800, fontSize: 190, letterSpacing: '-0.05em', color, lineHeight: 1 }}>{big}</div>
    <div style={{ position: 'absolute', left: 66, top: 320, width: 640, fontFamily: interTight, fontWeight: 600, fontSize: 30, lineHeight: 1.25 }}>{line}</div>
  </Frame>
);

const ListSlide: React.FC<{ n: number; kicker: string; title: string; items: string[] }> = ({ n, kicker, title, items }) => (
  <Frame n={n} kicker={kicker}>
    <Title size={40}>{title}</Title>
    <div style={{ position: 'absolute', left: 64, top: 170 }}>
      {items.map((it, i) => (
        <div key={it} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 23, marginBottom: 19, fontWeight: 500 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(95,212,196,0.16)', color: C.teal, display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700 }}>{i + 1}</span>{it}
        </div>
      ))}
    </div>
  </Frame>
);

// The slide the demo jumps to. Its curve draws in as the video plays past 1:12:40.
export const CaffeineSlide: React.FC<{ n: number; build: number }> = ({ n, build }) => {
  const x0 = 96, x1 = 640, yTop = 214, yBot = 424;
  const hours = 18; // noon .. 6 am
  const X = (h: number) => x0 + ((h - 12) / hours) * (x1 - x0);
  const Y = (v: number) => yBot - v * (yBot - yTop);
  const coffee = 14; // 2 pm
  const pts: string[] = [];
  for (let h = 12; h <= 30; h += 0.25) {
    const v = h < coffee ? 0.04 : h < coffee + 0.75 ? 0.04 + 0.96 * ((h - coffee) / 0.75) : Math.pow(0.5, (h - coffee - 0.75) / 5);
    pts.push(`${X(h).toFixed(1)},${Y(v).toFixed(1)}`);
  }
  const k = ease.inOutCubic(clamp(build));
  const total = 1400;
  const tag = (h: number, label: string, sub: string, color: string, appear: number) => {
    const v = Math.pow(0.5, (h - coffee - 0.75) / 5);
    const o = clamp((k - appear) / 0.12);
    return (
      <g opacity={o}>
        <line x1={X(h)} x2={X(h)} y1={Y(v)} y2={yBot} stroke={color} strokeDasharray="3 4" strokeWidth={1.5} />
        <circle cx={X(h)} cy={Y(v)} r={6} fill={color} />
        <text x={X(h) + 12} y={Y(v) - 12} fontSize="15" fontWeight={700} fill={C.ink} fontFamily={interTight}>{label}</text>
        <text x={X(h) + 12} y={Y(v) + 8} fontSize="12" fill={C.dim} fontFamily={inter}>{sub}</text>
      </g>
    );
  };
  return (
    <Frame n={n} kicker="Caffeine, alcohol and light">
      <Title size={40}>Caffeine’s half-life:<br /><span style={{ color: C.amber }}>about five hours.</span></Title>
      <svg style={{ position: 'absolute', left: 0, top: 0 }} width={W} height={H}>
        <defs>
          <linearGradient id="cf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={C.coral} stopOpacity="0.35" /><stop offset="1" stopColor={C.coral} stopOpacity="0" /></linearGradient>
          <clipPath id="cfc"><rect x={x0} y={0} width={(x1 - x0) * k} height={H} /></clipPath>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((v) => <line key={v} x1={x0} x2={x1} y1={Y(v)} y2={Y(v)} stroke={C.grid} />)}
        <line x1={x0} x2={x1} y1={yBot} y2={yBot} stroke="rgba(255,255,255,0.18)" />
        {[['Noon', 12], ['2 pm', 14], ['7 pm', 19], ['Midnight', 24], ['6 am', 30]].map(([l, h]) => (
          <text key={l as string} x={X(h as number)} y={yBot + 26} textAnchor="middle" fontSize="12" fill={C.faint} fontFamily={inter}>{l}</text>
        ))}
        <g clipPath="url(#cfc)">
          <polygon points={`${X(12)},${yBot} ${pts.join(' ')} ${X(30)},${yBot}`} fill="url(#cf)" />
          <polyline points={pts.join(' ')} fill="none" stroke={C.coral} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={`${total * k} ${total}`} />
        </g>
        {tag(19.75, '50%', '7 pm', C.amber, 0.45)}
        {tag(24.75, '25%', 'midnight', C.violet, 0.75)}
        <g opacity={clamp(k / 0.15)}>
          <text x={X(coffee)} y={Y(1) - 14} textAnchor="middle" fontSize="13" fontWeight={700} fill={C.coral} fontFamily={interTight}>☕ 2 pm coffee</text>
        </g>
      </svg>
      <div style={{ position: 'absolute', left: 690, top: 196, width: 250, opacity: clamp((k - 0.85) / 0.15) }}>
        <div style={{ fontSize: 13, letterSpacing: '0.16em', color: C.amber, fontWeight: 700, fontFamily: interTight }}>THE RULE</div>
        <div style={{ marginTop: 10, fontFamily: interTight, fontWeight: 700, fontSize: 27, lineHeight: 1.2 }}>No caffeine within 8–10 hours of bedtime.</div>
      </div>
    </Frame>
  );
};

export const LectureVideo: React.FC<{ sec: number; buildFrom?: number }> = ({ sec, buildFrom = 4360 }) => {
  const idx = sectionIndexAt(sec);
  const n = idx + 2;
  if (sec < 60) return <TitleSlide />;
  switch (idx) {
    case 0: return <ThirdSlide n={n} />;
    case 1: return <ClockSlide n={n} />;
    case 2: return <HypnoSlide n={n} />;
    case 3: return <BarsSlide n={n} kicker="Sleep, memory and learning" title={<>Sleep <span style={{ color: C.teal }}>before</span> learning</>} a={['Rested', 0.92]} b={['One night without sleep', 0.55]} note="How well new facts are encoded" color={C.teal} />;
    case 4: return <BigNumberSlide n={n} kicker="Body and health" big="4.2×" line={<>more likely to catch a cold on <span style={{ color: C.coral }}>under six hours</span> of sleep.</>} color={C.coral} />;
    case 5: return <CaffeineSlide n={n} build={clamp((sec - buildFrom) / 2.3)} />;
    case 6: return <ListSlide n={n} kicker="Building a better night" title="Five habits that matter" items={['A fixed wake-up time', 'Morning light, outside', 'An early caffeine cut-off', 'A cool, dark bedroom', 'A wind-down hour']} />;
    case 7: return <BarsSlide n={n} kicker="Insomnia and disorders" title={<>CBT-I outlasts <span style={{ color: C.violet }}>sleeping pills</span></>} a={['CBT-I, after one year', 0.82]} b={['Pills, after one year', 0.38]} note="Benefit that lasts after treatment ends" color={C.violet} />;
    case 8: return <BigNumberSlide n={n} kicker="Trackers and myths" big="Trends" line={<>beat nightly scores. Don’t chase a number.</>} color={C.teal} />;
    case 9: return <BigNumberSlide n={n} kicker="Audience questions" big="Q&A" line={<>Naps, melatonin, shift work and teenagers.</>} color={C.amber} />;
    default: return <ListSlide n={n} kicker="Putting it together" title="The five rules" items={['Wake at the same time', 'Get morning light', 'Stop caffeine early', 'Keep it cool and dark', 'Wind down for an hour']} />;
  }
};

export const LECTURE_W = W;
export const LECTURE_H = H;
