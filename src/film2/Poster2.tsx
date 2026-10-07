// The poster for the "Daylight" films (dark by default, the one chosen): the
// name set large on the sheet, and the product framed beside it at the moment
// that sells it — the summary open on the answer, circled in red pen. It is the
// landing page's <video poster> and the first frame of the README cut, so the
// name has to read at thumbnail size.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { windowAt } from '../film/Film';
import { T } from '../film/T';
import { targetRow } from '../film/youtube';
import { ChromeWindow } from '../ui/ChromeWindow';
import { usePreloadSnapshots } from '../lib/Snapshot';
import { Frame, Paper, PaletteProvider, PALETTES, SERIF, Theme2 } from './style';
import { Pen, PenMark } from './Pen';
import { Stamp, Tagline } from './Pages';

export const Poster2: React.FC<{ theme?: Theme2 }> = ({ theme = 'dark' }) => {
  usePreloadSnapshots();
  const C = PALETTES[theme];
  const t = T.outroIn + 1.2;                    // playing on past 1:12:40, the panel following
  const w = windowAt(t, theme);
  // the whole window, matted, so nothing on screen is cut mid-word
  const rect = { x: 712, y: 160, w: 1160, h: 760, r: 30 };
  const cam = { x: 720, y: 448, z: 0.775 };
  const row = targetRow();
  const rowY = row.y + 40 + row.h / 2;          // the outro scrolls the list 40 px less
  const marks: PenMark[] = [
    { kind: 'circle', at: 0, out: 1e9, cx: 1222, cy: rowY, rx: 212, ry: 32, w: 4.2, seed: 5 },
    { kind: 'note', at: 0, out: 1e9, x: 860, y: rowY + 96, text: 'the answer, at 1:12:40', size: 44, rot: -4, tab: true, align: 'center' },
  ];
  return (
    <PaletteProvider theme={theme}>
      <AbsoluteFill style={{ background: C.paper }}>
        <Paper />
        <Frame rect={rect} cam={cam}>
          <ChromeWindow theme={theme} t={t} tabs={w.tabs} active={w.active} url={w.url}>{w.content}</ChromeWindow>
          <Pen marks={marks} t={100} />
        </Frame>
        <div style={{ position: 'absolute', left: 104, top: 0, bottom: 0, width: 580, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ filter: C.stampShadow, width: 92 }}><Stamp size={92} /></div>
          <div style={{ marginTop: 40, fontFamily: SERIF, fontSize: 118, lineHeight: 0.9, letterSpacing: '-0.012em', color: C.ink }}>Timestamped<br />Summary</div>
          <div style={{ marginTop: 20, fontFamily: SERIF, fontStyle: 'italic', fontSize: 58, lineHeight: 1, color: C.ink2 }}>for YouTube</div>
          <Tagline size={27} underline={1} style={{ marginTop: 40 }} />
        </div>
      </AbsoluteFill>
    </PaletteProvider>
  );
};
