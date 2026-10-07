import React from 'react';
import { AbsoluteFill, Composition } from 'remotion';
import { Snapshot } from './lib/Snapshot';
import { useT } from './lib/time';
import { PanelTest } from './PanelTest';
import { WaapiTest } from './WaapiTest';
import { WorldTest } from './WorldTest';
import { Measure, PROBES } from './film/Measure';
import { Film } from './film/Film';
import { DURATION } from './film/T';
import { Poster } from './film/Poster';
import { PickerTest } from './film/PickerTest';
import { Film2 } from './film2/Film2';
import { Poster2 } from './film2/Poster2';

const SnapTest: React.FC<{ name: string }> = ({ name }) => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: '#222' }}>
      <div style={{ transform: 'scale(1.3333)', transformOrigin: '0 0' }}>
        <Snapshot name={name} t={t} start={0} width={1440} height={810} />
      </div>
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SnapTest" component={SnapTest} durationInFrames={120} fps={60} width={1920} height={1080} defaultProps={{ name: 'settings-summaries' }} />
    <Composition id="PanelTest" component={PanelTest} durationInFrames={60} fps={60} width={2160} height={900} />
    <Composition id="WaapiTest" component={WaapiTest} durationInFrames={60} fps={60} width={400} height={500} />
    <Composition id="WorldTest" component={WorldTest} durationInFrames={60} fps={60} width={1920} height={1080} defaultProps={{ mode: 'empty' as const, sec: 4360, scrub: 0 }} />
    <Composition id="Measure" component={Measure} durationInFrames={PROBES.length} fps={30} width={1600} height={1000} />
    <Composition id="Promo" component={Film} durationInFrames={DURATION * 60} fps={60} width={1920} height={1080} />
    <Composition id="PromoDraft" component={Film} durationInFrames={DURATION * 30} fps={30} width={1920} height={1080} />
    <Composition id="Promo2" component={Film2} durationInFrames={DURATION * 60} fps={60} width={1920} height={1080} />
    <Composition id="Promo2Draft" component={Film2} durationInFrames={DURATION * 30} fps={30} width={1920} height={1080} defaultProps={{ withAudio: false }} />
    <Composition id="Promo3" component={Film2} durationInFrames={DURATION * 60} fps={60} width={1920} height={1080} defaultProps={{ theme: 'dark' as const }} />
    <Composition id="Promo3Draft" component={Film2} durationInFrames={DURATION * 30} fps={30} width={1920} height={1080} defaultProps={{ withAudio: false, theme: 'dark' as const }} />
    <Composition id="PosterDaylight" component={Poster2} durationInFrames={1} fps={30} width={1920} height={1080} defaultProps={{ theme: 'dark' as const }} />
    <Composition id="PickerTest" component={PickerTest} durationInFrames={1} fps={30} width={1856} height={992} defaultProps={{ theme: 'dark' as const }} />
    <Composition id="Poster" component={Poster} durationInFrames={1} fps={30} width={1920} height={1080} />
  </>
);
