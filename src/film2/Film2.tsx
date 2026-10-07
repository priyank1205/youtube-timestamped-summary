// "Daylight": the second film. The same screen action as the first film, on
// the same clock — set on a sheet of warm paper, the browser framed like a
// photograph beside editorial captions, marked up in red pen. `theme="dark"`
// runs the same film at night: a near-black sheet with the product in dark mode.
import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { useT, clamp, ease } from '../lib/time';
import { T } from '../film/T';
import { windowAt } from '../film/Film';
import { cursorTrack } from '../film/script';
import { Cursor } from '../film/cursor';
import { Popup } from '../film/settings';
import { DownloadBubble, FolderPicker } from '../film/install';
import { ChromeWindow } from '../ui/ChromeWindow';
import { usePreloadSnapshots } from '../lib/Snapshot';
import { Frame, Paper, PaletteProvider, PALETTES, Theme2 } from './style';
import { Pen } from './Pen';
import { COLUMN, PEN, camera2, frameAt, frameOpacity } from './script';
import { Answer, Closing, Column, Fin, Furniture, Question, SmallPrint, ThreeSteps } from './Pages';

export const Film2: React.FC<{ withAudio?: boolean; theme?: Theme2 }> = ({ withAudio = true, theme = 'light' }) => {
  usePreloadSnapshots();
  const t = useT();
  const rect = frameAt(t);
  const cam = camera2(t);
  const fo = frameOpacity(t);
  const w = windowAt(t, theme);
  const C = PALETTES[theme];
  // The page furniture shows whenever there is paper around the frame.
  const fullness = clamp((rect.w - 1148) / (1920 - 1148));
  const furniture = (1 - fullness) * (1 - clamp((t - (T.endCard - 0.4)) / 0.4));
  const fadeIn = ease.css(clamp(t / 0.5));
  return (
    <PaletteProvider theme={theme}>
      <AbsoluteFill style={{ background: C.paper }}>
        <Paper />
        <Furniture t={t} opacity={furniture} />
        {COLUMN.map((c, i) => <Column key={i} c={c} t={t} />)}
        {fo > 0.001 ? (
          <Frame rect={rect} cam={cam} opacity={fo}>
            <ChromeWindow theme={theme} t={t} tabs={w.tabs} active={w.active} url={w.url} download={w.download}>
              {w.content}
            </ChromeWindow>
            <Popup t={t} />
            <DownloadBubble t={t} theme={theme} />
            {t >= T.extEnter && t < T.setupIn ? <FolderPicker t={t} theme={theme} /> : null}
            <Pen marks={PEN} t={t} />
            <Cursor track={cursorTrack} t={t} />
          </Frame>
        ) : null}
        <Question t={t} />
        <Answer t={t} />
        <SmallPrint t={t} />
        <ThreeSteps t={t} />
        <Closing t={t} />
        <Fin t={t} />
        <AbsoluteFill style={{ background: C.paper, opacity: 1 - fadeIn, pointerEvents: 'none' }} />
        {withAudio ? <Audio src={staticFile('audio/soundtrack2.wav')} /> : null}
      </AbsoluteFill>
    </PaletteProvider>
  );
};
