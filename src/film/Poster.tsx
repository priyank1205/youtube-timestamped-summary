// The poster: one frame that sells the whole thing. The lockup on a dark stage,
// and the product itself — YouTube with the panel open on the answer — rising
// toward the viewer below it, lit from behind. It is the landing page's
// <video poster> and the first frame of the README cut (what GitHub shows
// before anyone presses play), so it has to read at thumbnail size too.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ChromeWindow } from '../ui/ChromeWindow';
import { YouTubePage } from '../ui/YouTubePage';
import { Panel } from '../ui/Panel';
import { ALL_POINTS, TARGET_INDEX, VIDEO } from '../data/video';
import { SCROLL_TO } from './youtube';
import { GlassIcon, Stage } from './EndCard';
import { Grain } from './Wallpaper';
import { interTight } from '../lib/fonts';

const Product: React.FC = () => {
  const t = 50;
  const target = ALL_POINTS[TARGET_INDEX];
  return (
    <ChromeWindow t={t} active="yt" tabs={[{ id: 'yt', title: `${VIDEO.title} - YouTube`, favicon: 'youtube' }]} url={{ host: 'youtube.com', path: '/watch?v=Zt3v8kNq5bY&t=4360s' }}>
      <YouTubePage t={t} search={{ text: VIDEO.query, caret: false, focused: false }} player={{ sec: target.sec + 70, playing: true, controls: 0, buildFrom: -1e9 }}
        panel={<Panel t={t} view={{ mode: 'summary', level: { from: 2, to: 2, at: -10 }, summaryAt: -10, scrollTop: SCROLL_TO + 255, now: { index: TARGET_INDEX, progress: 0.45 } }} />} />
    </ChromeWindow>
  );
};

export const Poster: React.FC = () => (
  <AbsoluteFill style={{ background: '#040406', overflow: 'hidden' }}>
    <Stage t={0} cy={62} />
    {/* light behind the window's top edge */}
    <div style={{ position: 'absolute', left: 260, top: 365, width: 1400, height: 420, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(235,30,70,0.42), rgba(160,14,48,0.18) 50%, rgba(0,0,0,0) 80%)', filter: 'blur(20px)' }} />
    {/* the product, tilted back like it is resting on a desk in front of us */}
    <div style={{ position: 'absolute', left: 960 - 720, top: 440, width: 1440, height: 896, transformOrigin: '50% 0', transform: 'perspective(2200px) rotateX(26deg) scale(1.02)' }}>
      <Product />
      {/* rim light on the panel: where the eye should land */}
      <div style={{ position: 'absolute', left: 1025, top: 151, width: 402, height: 664, borderRadius: 14, boxShadow: '0 0 0 1.5px rgba(255,96,112,0.6), 0 0 48px rgba(255,40,72,0.38)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 12, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
    </div>
    {/* the stage floor fades the bottom of the window away */}
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(4,4,6,0) 62%, rgba(4,4,6,0.75) 86%, #040406 100%)' }} />
    {/* lockup */}
    <div style={{ position: 'absolute', left: 0, right: 0, top: 86, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: interTight }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <GlassIcon size={104} sweep={-1} id="poster" />
        <div style={{ whiteSpace: 'nowrap', fontSize: 84, fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1 }}>
          <span style={{ background: 'linear-gradient(180deg, #ffffff 30%, rgba(255,255,255,0.8))', WebkitBackgroundClip: 'text', color: 'transparent' }}>Timestamped Summary</span>
          <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.42)' }}> for YouTube</span>
        </div>
      </div>
      <div style={{ marginTop: 30, fontSize: 44, fontWeight: 500, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.78)' }}>
        Read the video <span style={{ color: '#ff5c6c', fontWeight: 600 }}>before</span> you watch it.
      </div>
    </div>
    <AbsoluteFill style={{ background: 'radial-gradient(130% 120% at 50% 40%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.5) 100%)' }} />
    <Grain t={0.4} opacity={0.05} />
  </AbsoluteFill>
);
