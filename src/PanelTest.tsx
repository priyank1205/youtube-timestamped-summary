import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Panel, PanelView } from './ui/Panel';
import { YT_FONT } from './lib/fonts';
import { useT } from './lib/time';
import { TARGET_INDEX } from './data/video';

const L = (from: number, to: number, at = -10) => ({ from, to, at });

export const PanelTest: React.FC = () => {
  const t = useT() + 100;
  const views: PanelView[] = [
    { mode: 'empty', level: L(2, 2) },
    { mode: 'empty', level: L(1, 2, 95), pop: { openedAt: 90 } },
    { mode: 'empty', level: L(2, 2), gen: { since: 99, label: 'Generating summary... 2/4 parts' } },
    { mode: 'summary', level: L(2, 2), summaryAt: 0, hover: { index: 2, amt: 1 } },
    { mode: 'summary', level: L(2, 2), summaryAt: 0, scrollTop: 900, now: { index: TARGET_INDEX, progress: 0.3 }, expand: { index: TARGET_INDEX, at: 0 } },
  ];
  return (
    <AbsoluteFill style={{ background: '#0f0f0f', fontFamily: YT_FONT, flexDirection: 'row', gap: 24, padding: 24 }}>
      {views.map((v, i) => (
        <div key={i} style={{ width: 396, flexShrink: 0 }}><Panel view={v} t={t} /></div>
      ))}
    </AbsoluteFill>
  );
};
