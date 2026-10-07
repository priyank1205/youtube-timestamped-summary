// Layout probe. Each frame renders one UI state at camera zoom 1 and logs the
// window-space rectangle of every [data-m] element; capture/measure.mjs collects
// them into src/data/layout.json, which the choreography reads for cursor
// targets and camera framing. Same components as the film, so same layout.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ChromeWindow } from '../ui/ChromeWindow';
import { YouTubePage } from '../ui/YouTubePage';
import { Panel, PanelView } from '../ui/Panel';
import { TARGET_INDEX } from '../data/video';

type Probe = { name: string; view: PanelView };
const L = (n: number) => ({ from: n, to: n, at: -100 });
export const PROBES: Probe[] = [
  { name: 'empty', view: { mode: 'empty', level: L(1) } },
  { name: 'pop', view: { mode: 'empty', level: L(1), pop: { openedAt: -100 } } },
  { name: 'summary', view: { mode: 'summary', level: L(2), summaryAt: -100 } },
  { name: 'expanded', view: { mode: 'summary', level: L(2), summaryAt: -100, expand: { index: TARGET_INDEX, at: -100 } } },
  { name: 'collapsed', view: { mode: 'summary', level: L(2), summaryAt: -100, collapse: { at: -100 } } },
];

export const Measure: React.FC = () => {
  const frame = useCurrentFrame();
  const probe = PROBES[Math.min(frame, PROBES.length - 1)];
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = ref.current!;
    const win = root.querySelector('[data-m="window"]') as HTMLElement;
    const o = win.getBoundingClientRect();
    const out: Record<string, [number, number, number, number]> = {};
    root.querySelectorAll('[data-m]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const k = el.getAttribute('data-m')!;
      if (!(k in out)) out[k] = [+(r.left - o.left).toFixed(1), +(r.top - o.top).toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1)];
    });
    // Content offset of the summary list (for converting scroll to positions).
    console.log('MEASURE ' + JSON.stringify({ name: probe.name, rects: out }));
  });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <div ref={ref} style={{ position: 'absolute', left: 0, top: 0 }}>
        <ChromeWindow t={0} active="yt" tabs={[{ id: 'yt', title: 'YouTube', favicon: 'youtube' }]} url={{ host: 'youtube.com', path: '/watch' }}>
          <YouTubePage t={0} search={{ text: '', caret: false, focused: false }} player={{ sec: 0, playing: false, controls: 1 }}
            panel={<Panel t={0} view={probe.view} />} />
        </ChromeWindow>
      </div>
    </AbsoluteFill>
  );
};
