import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ChromeWindow, WINDOW_H } from './ui/ChromeWindow';
import { YouTubePage } from './ui/YouTubePage';
import { Panel } from './ui/Panel';
import { useT } from './lib/time';

export const WorldTest: React.FC<{ mode: 'empty' | 'summary'; sec: number; scrub: number }> = ({ mode, sec, scrub }) => {
  const t = useT() + 50;
  const s = 1080 / WINDOW_H * 0.98;
  return (
    <AbsoluteFill style={{ background: '#111', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ transform: `scale(${s})` }}>
        <ChromeWindow t={t} active="yt" tabs={[{ id: 'yt', title: 'The Science of Sleep: Full Masterclass (Every Question Answered) - YouTube', favicon: 'youtube' }]}
          url={{ host: 'youtube.com', path: '/watch?v=n1ghtSch00l' }}>
          <YouTubePage t={t} search={{ text: 'when should i stop drinking coffee', caret: false, focused: false }}
            player={{ sec, playing: false, controls: 1, barHover: scrub > 0 ? 1 : 0, scrub: scrub > 0 ? { frac: scrub, amt: 1 } : null }}
            panel={<Panel t={t} view={mode === 'empty' ? { mode: 'empty', level: { from: 1, to: 1, at: 0 } } : { mode: 'summary', level: { from: 2, to: 2, at: 0 }, summaryAt: 0 }} />} />
        </ChromeWindow>
      </div>
    </AbsoluteFill>
  );
};
