// A YouTube watch page, drawn to the geometry measured from youtube.com at a
// 1440×810 viewport (capture/youtube-reference.mjs): masthead 56px, player
// 996×560 at (16, 68), sidebar 396px at x=1028. Icons are YouTube's own. Dark
// theme by default; `theme="light"` uses the light theme's colours as measured
// by capture/youtube-reference-light.mjs. Everything shown in it — channel,
// video, recommendations — is fictional.
import React from 'react';
import * as I from './yt-icons';
import { YT_FONT, interTight } from '../lib/fonts';
import { CHAPTER_STARTS, VIDEO, chapterAt, fmtClock } from '../data/video';
import { LectureVideo } from './LectureVideo';
import { clamp } from '../lib/time';

export type YTTheme = 'dark' | 'light';
const PALETTES = {
  dark: {
    page: '#0f0f0f', text: '#f1f1f1', text2: '#aaa', pill: 'rgba(255,255,255,0.1)', divider: 'rgba(255,255,255,0.2)',
    searchBg: '#121212', searchBorder: '#303030', searchBtn: 'rgba(255,255,255,0.08)', placeholder: '#888', caret: '#f1f1f1',
    subBg: '#f1f1f1', subText: '#0f0f0f', chipOn: '#f1f1f1', chipOnText: '#0f0f0f', menuBg: '#212121', menuShadow: '0 4px 32px rgba(0,0,0,0.6)', logoText: '#fff',
  },
  light: {
    page: '#ffffff', text: '#0f0f0f', text2: '#606060', pill: 'rgba(0,0,0,0.05)', divider: 'rgba(0,0,0,0.1)',
    searchBg: '#ffffff', searchBorder: '#d3d3d3', searchBtn: '#f8f8f8', placeholder: '#888', caret: '#0f0f0f',
    subBg: '#0f0f0f', subText: '#f1f1f1', chipOn: '#0f0f0f', chipOnText: '#ffffff', menuBg: '#ffffff', menuShadow: '0 4px 32px rgba(0,0,0,0.1)', logoText: '#212121',
  },
};
type Palette = typeof PALETTES.dark;
const PaletteCtx = React.createContext<Palette>(PALETTES.dark);
const usePal = () => React.useContext(PaletteCtx);

export const YT = {
  vw: 1440, vh: 810,
  player: { x: 16, y: 68, w: 996, h: 560 },
  sidebar: { x: 1028, y: 68, w: 396 },
  search: { x: 366, y: 8, w: 572, h: 40 },
  bar: { x: 12, y: 498, w: 972 }, // progress bar, relative to the player
};

const Icon: React.FC<{ svg: string; size?: number; style?: React.CSSProperties; color?: string }> = ({ svg, size = 24, style, color }) => {
  const P = usePal();
  return <IconRaw svg={svg} size={size} style={style} color={color ?? P.text} />;
};
const IconRaw: React.FC<{ svg: string; size: number; style?: React.CSSProperties; color: string }> = ({ svg, size, style, color }) => (
  <span style={{ width: size, height: size, display: 'inline-flex', color, fill: color, ...style }}
    dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', `<svg style="width:100%;height:100%;display:block" `) }} />
);

// --- Masthead ------------------------------------------------------------------------
export type SearchState = { text: string; caret: boolean; focused: boolean };

const Masthead: React.FC<{ search: SearchState }> = ({ search }) => {
  const P = usePal();
  return (
  <div style={{ position: 'absolute', left: 0, top: 0, width: YT.vw, height: 56, background: P.page, zIndex: 5 }}>
    <div style={{ position: 'absolute', left: 16, top: 8, width: 40, height: 40, display: 'grid', placeItems: 'center' }}><Icon svg={I.guide} /></div>
    <div className="ytl" style={{ position: 'absolute', left: 72, top: 18, width: 93, height: 20 }} dangerouslySetInnerHTML={{ __html: I.logo.replace('<svg ', '<svg style="width:93px;height:20px;display:block" ') }} />
    {/* Search box: 572px field + 64px button, as measured */}
    <div style={{
      position: 'absolute', left: YT.search.x, top: 8, width: YT.search.w, height: 40, boxSizing: 'border-box',
      background: P.searchBg, border: `1px solid ${search.focused ? '#1c62b9' : P.searchBorder}`, borderRight: 'none',
      borderRadius: '40px 0 0 40px', padding: '0 4px 0 16px', display: 'flex', alignItems: 'center',
      boxShadow: search.focused ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : 'none',
    }} data-m="search">
      {search.focused ? <Icon svg={I.search} size={20} style={{ marginRight: 12, marginLeft: -2 }} /> : null}
      <span style={{ fontSize: 16, color: search.text ? P.text : P.placeholder, fontFamily: YT_FONT, whiteSpace: 'pre', letterSpacing: '0.01em' }}>{search.text || 'Search'}</span>
      {search.caret ? <span style={{ width: 1.5, height: 20, background: P.caret, marginLeft: 1 }} /> : null}
    </div>
    <div style={{ position: 'absolute', left: YT.search.x + YT.search.w, top: 8, width: 64, height: 40, boxSizing: 'border-box', background: P.searchBtn, border: `1px solid ${P.searchBorder}`, borderRadius: '0 40px 40px 0', display: 'grid', placeItems: 'center' }}>
      <Icon svg={I.search} />
    </div>
    <div style={{ position: 'absolute', left: 1018, top: 8, width: 40, height: 40, borderRadius: 20, background: P.pill, display: 'grid', placeItems: 'center' }}><Icon svg={I.voice} /></div>
    {/* Signed-in end: Create, notifications, avatar */}
    <div style={{ position: 'absolute', right: 120, top: 10, height: 36, padding: '0 16px 0 10px', borderRadius: 18, background: P.pill, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: P.text }}>
      <svg width="24" height="24" viewBox="0 0 24 24"><path d="M11 5v6H5v2h6v6h2v-6h6v-2h-6V5z" fill={P.text} /></svg>Create
    </div>
    <div style={{ position: 'absolute', right: 68, top: 8, width: 40, height: 40, display: 'grid', placeItems: 'center' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={P.text} strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0-6 6v4.2L4.5 16h15L18 13.2V9a6 6 0 0 0-6-6Z" /><path d="M9.8 18.5a2.3 2.3 0 0 0 4.4 0" strokeLinecap="round" /></svg>
      <span style={{ position: 'absolute', right: 3, top: 2, background: '#cc0000', color: '#fff', fontSize: 11, fontWeight: 500, borderRadius: 9, padding: '1px 5px', lineHeight: '15px' }}>9+</span>
    </div>
    <div style={{ position: 'absolute', right: 20, top: 12, width: 32, height: 32, borderRadius: 16, background: 'linear-gradient(135deg, #5b6cff, #c056d6)', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 500, color: '#fff' }}>A</div>
  </div>
  );
};

// --- Player ----------------------------------------------------------------------------
export type PlayerState = {
  sec: number;               // playhead, seconds into the video
  playing: boolean;
  controls: number;          // 0..1: player chrome visibility
  barHover?: number;         // 0..1: progress bar hovered (thicker bar, bigger scrubber)
  scrub?: { frac: number; amt: number } | null;  // hover preview at a fraction of the bar
  buffering?: number;        // 0..1 spinner
  buildFrom?: number;        // video time the caffeine chart starts building
};

const Spinner: React.FC<{ t: number; o: number }> = ({ t, o }) => (
  <svg width="64" height="64" viewBox="0 0 64 64" style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -32, marginTop: -32, opacity: o, transform: `rotate(${(t * 360 * 1.1) % 360}deg)` }}>
    <circle cx="32" cy="32" r="26" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeDasharray="110 300" />
  </svg>
);

const Player: React.FC<{ t: number; p: PlayerState }> = ({ t, p }) => {
  const { w, h } = YT.player;
  const frac = clamp(p.sec / VIDEO.duration);
  const bh = 3 + 2 * (p.barHover || 0);
  const chapters = CHAPTER_STARTS.map((s, i) => [s, CHAPTER_STARTS[i + 1] ?? VIDEO.duration] as const);
  const scrub = p.scrub && p.scrub.amt > 0 ? p.scrub : null;
  const scrubSec = scrub ? scrub.frac * VIDEO.duration : 0;
  return (
    <div style={{ position: 'absolute', left: YT.player.x, top: YT.player.y, width: w, height: h, borderRadius: 12, overflow: 'hidden', background: '#000' }} data-m="player">
      <LectureVideo sec={p.sec} buildFrom={p.buildFrom} />
      {p.buffering ? <Spinner t={t} o={p.buffering} /> : null}
      {/* Chrome */}
      <div style={{ position: 'absolute', inset: 0, opacity: p.controls }}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140, background: 'linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.32) 45%, rgba(0,0,0,0))' }} />
        {/* Progress bar with chapter gaps */}
        <div style={{ position: 'absolute', left: YT.bar.x, top: YT.bar.y + 3 - bh / 2, width: YT.bar.w, height: bh }} data-m="bar">
          {chapters.map(([a, b], i) => {
            const L = (a / VIDEO.duration) * YT.bar.w, R = (b / VIDEO.duration) * YT.bar.w - (i < chapters.length - 1 ? 2 : 0);
            const playedR = clamp((frac * YT.bar.w - L) / Math.max(1, R - L));
            const loadedR = clamp(((frac + 0.035) * YT.bar.w - L) / Math.max(1, R - L));
            return (
              <div key={i} style={{ position: 'absolute', left: L, width: R - L, top: 0, bottom: 0, background: 'rgba(255,255,255,0.2)', borderRadius: i === 0 ? '2px 0 0 2px' : i === chapters.length - 1 ? '0 2px 2px 0' : 0, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${loadedR * 100}%`, background: 'rgba(255,255,255,0.4)' }} />
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${playedR * 100}%`, background: 'linear-gradient(90deg, #ff0033 80%, #ff2791)', backgroundSize: `${frac * YT.bar.w}px 100%`, backgroundPosition: `${-L}px 0` }} />
              </div>
            );
          })}
          <div style={{ position: 'absolute', left: frac * YT.bar.w - 6.5, top: bh / 2 - 6.5, width: 13, height: 13, borderRadius: 7, background: '#ff0033', transform: `scale(${0.92 + 0.08 * (p.barHover || 0)})` }} data-m="scrubber" />
        </div>
        {/* Scrub preview */}
        {scrub ? (
          <div style={{ position: 'absolute', left: clamp(YT.bar.x + scrub.frac * YT.bar.w - 120, 12, w - 252), top: YT.bar.y - 196, width: 240, opacity: scrub.amt }}>
            <div style={{ textAlign: 'center', fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginBottom: 8, fontWeight: 500, textShadow: '0 0 4px rgba(0,0,0,0.6)' }}>Pull up for precise seeking</div>
            <div style={{ width: 240, height: 135, borderRadius: 8, overflow: 'hidden', position: 'relative', boxShadow: '0 0 0 1px rgba(255,255,255,0.12)' }}>
              <div style={{ width: 996, height: 560, transform: 'scale(0.241)', transformOrigin: '0 0' }}><LectureVideo sec={scrubSec} buildFrom={-1e9} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <div style={{ background: 'rgba(80,80,80,0.75)', borderRadius: 18, padding: '7px 16px', fontSize: 14, fontWeight: 500, color: '#fff', display: 'flex', gap: 10, whiteSpace: 'nowrap' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtClock(scrubSec)}</span><span>{chapterAt(scrubSec)}</span>
              </div>
            </div>
          </div>
        ) : null}
        {/* Controls row */}
        <div style={{ position: 'absolute', left: 12, top: 512, width: 972, height: 40, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, display: 'grid', placeItems: 'center' }}><Icon svg={p.playing ? I.pause : I.play} size={30} color="#fff" /></div>
          <div style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', marginLeft: 12 }}><Icon svg={I.volume} size={24} color="#fff" /></div>
          <div style={{ marginLeft: 12, fontSize: 14, fontWeight: 500, color: '#eee', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }} data-m="time">
            {fmtClock(p.sec)} / {fmtClock(VIDEO.duration)}
          </div>
          <div style={{ marginLeft: 26, fontSize: 14, fontWeight: 500, color: '#eee', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            {chapterAt(p.sec)}<Icon svg={I.chapterChevron} size={22} color="#fff" style={{ marginLeft: 2 }} />
          </div>
          <div style={{ flex: 1 }} />
          {/* Autoplay toggle */}
          <div style={{ width: 48, height: 40, display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 30, height: 15, borderRadius: 8, background: 'rgba(255,255,255,0.9)', position: 'relative' }}>
              <div style={{ position: 'absolute', right: -1, top: -2.5, width: 20, height: 20, borderRadius: 10, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}>
                <svg width="9" height="10" viewBox="0 0 9 10"><path d="M1 1l7 4-7 4z" fill="#0f0f0f" /></svg>
              </div>
            </div>
          </div>
          <div style={{ width: 48, height: 40, display: 'grid', placeItems: 'center' }}><Icon svg={I.subtitles} color="#fff" /></div>
          <div style={{ width: 48, height: 40, display: 'grid', placeItems: 'center', position: 'relative' }}>
            <Icon svg={I.settings} color="#fff" />
            <span style={{ position: 'absolute', right: 6, top: 7, background: '#f00', color: '#fff', fontSize: 7.5, fontWeight: 700, borderRadius: 2, padding: '0 2px', lineHeight: '10px' }}>HD</span>
          </div>
          <div style={{ width: 48, height: 40, display: 'grid', placeItems: 'center' }}><Icon svg={I.theater} color="#fff" /></div>
          <div style={{ width: 48, height: 40, display: 'grid', placeItems: 'center' }}><Icon svg={I.fullscreen} color="#fff" /></div>
        </div>
      </div>
    </div>
  );
};

// --- Below the player -------------------------------------------------------------------
const Pill: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ height: 40, borderRadius: 20, background: usePal().pill, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 14, fontWeight: 500, gap: 6, ...style }}>{children}</div>
);

const Meta: React.FC = () => {
  const P = usePal();
  return (
  <>
    <div style={{ position: 'absolute', left: 16, top: 640, width: 996, fontSize: 20, lineHeight: '28px', fontWeight: 700, color: P.text }}>{VIDEO.title}</div>
    <div style={{ position: 'absolute', left: 16, top: 676, width: 40, height: 40, borderRadius: 20, background: 'radial-gradient(circle at 35% 30%, #2b3766, #0b1020)', display: 'grid', placeItems: 'center' }}>
      <svg width="22" height="22" viewBox="0 0 24 24"><path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z" fill="#ffc95c" /></svg>
    </div>
    <div style={{ position: 'absolute', left: 68, top: 677, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 16, lineHeight: '22px', fontWeight: 500 }}>{VIDEO.channel}</span>
      <Icon svg={I.verified} size={14} color={P.text2} />
    </div>
    <div style={{ position: 'absolute', left: 68, top: 699, fontSize: 12, lineHeight: '18px', color: P.text2 }}>{VIDEO.subscribers}</div>
    <div style={{ position: 'absolute', left: 206, top: 677, height: 40, padding: '0 16px', borderRadius: 20, background: P.subBg, color: P.subText, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center' }}>Subscribe</div>
    <div style={{ position: 'absolute', right: 428, top: 679, display: 'flex', gap: 8 }}>
      <div style={{ display: 'flex', height: 40, borderRadius: 20, background: P.pill, alignItems: 'center', fontSize: 14, fontWeight: 500 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px 0 12px' }}><Icon svg={I.like} />{VIDEO.likes}</div>
        <div style={{ width: 1, height: 24, background: P.divider }} />
        <div style={{ padding: '0 14px 0 12px', display: 'flex' }}><Icon svg={I.dislike} /></div>
      </div>
      <Pill><Icon svg={I.share} />Share</Pill>
      <Pill><Icon svg={I.download} />Download</Pill>
      <Pill><Icon svg={I.save} />Save</Pill>
      <Pill style={{ width: 40, padding: 0, justifyContent: 'center' }}><Icon svg={I.more} /></Pill>
    </div>
    <div style={{ position: 'absolute', left: 16, top: 730, width: 996, borderRadius: 12, background: P.pill, padding: 12, boxSizing: 'border-box', fontSize: 14, lineHeight: '20px' }}>
      <div style={{ fontWeight: 500 }}>{VIDEO.views}&nbsp;&nbsp;{VIDEO.age}&nbsp;&nbsp;<span style={{ color: P.text2 }}>#sleep #neuroscience #health</span></div>
      <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{VIDEO.description}</div>
      <div style={{ fontWeight: 500, marginTop: 2 }}>...more</div>
    </div>
  </>
  );
};

// --- Recommendations ----------------------------------------------------------------------
type Rec = { title: string; channel: string; views: string; age: string; dur: string; bg: string; art: React.ReactNode; verified?: boolean };
const RECS: Rec[] = [
  { title: 'Why You Keep Waking Up at 3 a.m.', channel: 'Brainwave Lab', views: '1.2M', age: '2 weeks ago', dur: '14:52', bg: 'linear-gradient(135deg, #10234a, #070b16)',
    art: <div style={{ fontFamily: interTight, fontWeight: 800, fontSize: 62, color: '#ffcf5a', textShadow: '0 0 24px rgba(255,207,90,0.55)', letterSpacing: '-0.02em' }}>3:00<span style={{ fontSize: 26 }}>AM</span></div> },
  { title: 'I Quit Coffee for 30 Days. Here’s What Happened', channel: 'The Habit Lab', views: '874K', age: '1 month ago', dur: '18:07', bg: 'linear-gradient(135deg, #6b3b1f, #24130a)', verified: true,
    art: <div style={{ fontFamily: interTight, fontWeight: 800, fontSize: 44, color: '#fff', lineHeight: 0.95, textAlign: 'center' }}>NO<br /><span style={{ color: '#ffb36b' }}>COFFEE</span><br />30 DAYS</div> },
  { title: 'The 90-Minute Sleep Cycle, Explained', channel: 'Night School', views: '641K', age: '6 months ago', dur: '11:24', bg: 'linear-gradient(135deg, #2c1d5c, #0d0a1f)', verified: true,
    art: <svg width="200" height="80" viewBox="0 0 200 80"><path d="M0 60 Q 25 5 50 40 T 100 40 T 150 40 T 200 30" fill="none" stroke="#a991ff" strokeWidth="6" strokeLinecap="round" /><text x="100" y="78" textAnchor="middle" fontFamily={interTight} fontWeight={800} fontSize="22" fill="#fff">90 MIN</text></svg> },
  { title: 'The Science of the Perfect Nap', channel: 'Quick Science', views: '2.1M', age: '1 year ago', dur: '9:41', bg: 'linear-gradient(135deg, #0f4d4a, #062221)', verified: true,
    art: <div style={{ fontFamily: interTight, fontWeight: 800, fontSize: 56, color: '#7ff0de', letterSpacing: '-0.02em' }}>20<span style={{ fontSize: 24, color: '#fff' }}> MIN</span></div> },
  { title: 'How Light Controls Your Body Clock', channel: 'Night School', views: '1.6M', age: '8 months ago', dur: '16:30', bg: 'linear-gradient(180deg, #ff9a4d, #6a2a3a 60%, #1b1030)', verified: true,
    art: <div style={{ width: 70, height: 70, borderRadius: 35, background: '#ffe08a', boxShadow: '0 0 40px #ffcf5a' }} /> },
];

const Lockup: React.FC<{ r: Rec }> = ({ r }) => {
  const P = usePal();
  return (
  <div style={{ display: 'flex', gap: 12, width: 396, height: 151.5, marginBottom: 8 }}>
    <div style={{ width: 269.3, height: 151.5, borderRadius: 8, background: r.bg, position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      {r.art}
      <div style={{ position: 'absolute', right: 6, bottom: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 500, borderRadius: 4, padding: '1px 4px', lineHeight: '18px' }}>{r.dur}</div>
    </div>
    <div style={{ width: 114.7, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 14, lineHeight: '20px', fontWeight: 500, color: P.text, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.title}</div>
      <div style={{ fontSize: 12, lineHeight: '18px', color: P.text2, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.channel}</span>{r.verified ? <Icon svg={I.verified} size={12} color={P.text2} /> : null}
      </div>
      <div style={{ fontSize: 12, lineHeight: '18px', color: P.text2, whiteSpace: 'nowrap' }}>▷ {r.views}&nbsp;&nbsp;{r.age}</div>
    </div>
  </div>
  );
};

// --- Search suggestions (the dropdown under the box while typing) -------------------------
const SUGGEST = [
  'when should i stop drinking coffee',
  'when should i stop drinking coffee before bed',
  'when should i stop drinking coffee for sleep',
  'when should i stop drinking coffee in the afternoon',
  'when should i stop drinking caffeine',
  'when should i go to sleep',
  'when should i wake up',
  'when should i take melatonin',
  'whale sounds',
  'what is sleep',
];
const Suggestions: React.FC<{ text: string; amt: number }> = ({ text, amt }) => {
  const P = usePal();
  if (amt <= 0 || text.length < 2) return null;
  const q = text.toLowerCase();
  const items = SUGGEST.filter((s) => s.startsWith(q) && s !== q).slice(0, 7);
  const list = text.length >= 4 && SUGGEST.includes(q) ? [q, ...items] : items.length ? items : [q];
  return (
    <div style={{ position: 'absolute', left: YT.search.x, top: 52, width: YT.search.w, background: P.menuBg, borderRadius: 12, padding: '16px 0 8px', boxShadow: P.menuShadow, opacity: amt, zIndex: 6 }}>
      {list.slice(0, 7).map((s) => (
        <div key={s} style={{ height: 32, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16, fontSize: 16, color: P.text }}>
          <Icon svg={I.search} size={24} />
          <span style={{ whiteSpace: 'pre' }}>{s.slice(0, q.length)}<b style={{ fontWeight: 700 }}>{s.slice(q.length)}</b></span>
        </div>
      ))}
      <div style={{ textAlign: 'right', fontSize: 12, color: P.text2, fontStyle: 'italic', padding: '6px 16px 0' }}>Report search predictions</div>
    </div>
  );
};

// --- Home feed, the page the search starts from ------------------------------------------
const HOME = [
  ...RECS,
  { title: 'Deep Focus Music for Studying', channel: 'Calm Waves', views: '9.4M', age: '3 years ago', dur: '3:01:22', bg: 'linear-gradient(135deg, #1b3b5c, #0a1420)', art: <div style={{ fontFamily: interTight, fontWeight: 800, fontSize: 40, color: '#bfe3ff' }}>FOCUS</div> } as Rec,
  { title: 'Building a Second Brain in 30 Minutes', channel: 'Make It Stick', views: '512K', age: '5 days ago', dur: '31:08', bg: 'linear-gradient(135deg, #3a2a10, #120d05)', art: <div style={{ fontFamily: interTight, fontWeight: 800, fontSize: 40, color: '#ffd27a' }}>2ND BRAIN</div> } as Rec,
  { title: 'The History of Coffee, Explained', channel: 'Origins', views: '3.3M', age: '2 years ago', dur: '24:55', bg: 'linear-gradient(135deg, #4a2a1c, #170c07)', art: <div style={{ fontFamily: interTight, fontWeight: 800, fontSize: 40, color: '#f1c9a5' }}>☕ 1,000 YRS</div> } as Rec,
];
const HomeFeed: React.FC = () => {
  const P = usePal();
  const chips = ['All', 'Podcasts', 'Science', 'Music', 'Live', 'Health', 'Mixes', 'Lectures', 'Recently uploaded', 'New to you'];
  const cw = 456, ch = 256.5;
  return (
    <div style={{ position: 'absolute', left: 0, top: 56, width: YT.vw, height: YT.vh - 56, background: P.page }}>
      <div style={{ position: 'absolute', left: 24, top: 12, display: 'flex', gap: 12 }}>
        {chips.map((c, i) => (
          <div key={c} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: i === 0 ? P.chipOn : P.pill, color: i === 0 ? P.chipOnText : P.text, fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{c}</div>
        ))}
      </div>
      {HOME.slice(0, 6).map((r, i) => {
        const x = 24 + (i % 3) * (cw + 16), y = 68 + Math.floor(i / 3) * (ch + 112);
        return (
          <div key={r.title} style={{ position: 'absolute', left: x, top: y, width: cw }}>
            <div style={{ width: cw, height: ch, borderRadius: 12, background: r.bg, display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ transform: 'scale(1.5)' }}>{r.art}</div>
              <div style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 500, borderRadius: 4, padding: '1px 4px', lineHeight: '18px' }}>{r.dur}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: r.bg, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 16, lineHeight: '22px', fontWeight: 500, color: P.text }}>{r.title}</div>
                <div style={{ fontSize: 14, lineHeight: '20px', color: P.text2 }}>{r.channel}</div>
                <div style={{ fontSize: 14, lineHeight: '20px', color: P.text2 }}>{r.views} views · {r.age}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Page --------------------------------------------------------------------------------
export const YouTubePage: React.FC<{ t: number; search: SearchState; player: PlayerState; panel?: React.ReactNode; home?: number; suggest?: number; theme?: YTTheme }> = ({ t, search, player, panel, home = 0, suggest = 0, theme = 'dark' }) => {
  const P = PALETTES[theme];
  return (
  <PaletteCtx.Provider value={P}>
  <div style={{ position: 'absolute', left: 0, top: 0, width: YT.vw, height: YT.vh, background: P.page, color: P.text, fontFamily: YT_FONT, overflow: 'hidden' }} data-m="ytpage">
    <style>{`.ytl svg g:nth-of-type(2) path { fill: ${P.logoText}; }`}</style>
    {home < 1 ? (
      <>
        <Player t={t} p={player} />
        <Meta />
        <div style={{ position: 'absolute', left: YT.sidebar.x, top: YT.sidebar.y, width: YT.sidebar.w }} data-m="sidebar">
          {panel}
          {RECS.map((r) => <Lockup key={r.title} r={r} />)}
        </div>
      </>
    ) : null}
    {home > 0 ? <div style={{ position: 'absolute', inset: 0, opacity: home }}><HomeFeed /></div> : null}
    <Masthead search={search} />
    <Suggestions text={search.text} amt={suggest} />
  </div>
  </PaletteCtx.Provider>
  );
};
