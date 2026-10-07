// The film. One clock (seconds), layered bottom to top: the desk, the browser
// world under a camera, the pointer, then the narration and the full-frame
// graphics (reveal, trust, install title, end card).
import React from 'react';
import { AbsoluteFill, Audio, staticFile } from 'remotion';
import { useT, clamp, ease, lerp } from '../lib/time';
import { T } from './T';
import { Wallpaper } from './Wallpaper';
import { transformFor } from './camera';
import { camera, cursorTrack, captionsYouTube, captionsLater, SCRUB_WORDS } from './script';
import { Cursor, cursorAt } from './cursor';
import { Caption } from './Caption';
import { ChromeWindow, Tab } from '../ui/ChromeWindow';
import { YouTubePage } from '../ui/YouTubePage';
import { Panel, PanelView } from '../ui/Panel';
import { searchAt, playerAt, panelAt, loadBar, pageOpacity, homeOpacity, suggestOpacity, BAR_Y, spotlightAt, SCROLL_TO } from './youtube';
import { Spotlight } from './Spotlight';
import { Reveal } from './Reveal';
import { interTight } from '../lib/fonts';
import { ALL_POINTS, TARGET_INDEX, VIDEO } from '../data/video';
import { Popup, SettingsPage, settingsSpotlight } from './settings';
import { CardGlow, DownloadBubble, ExtensionsPage, FolderPicker, GitHubRelease, RELEASE_TAG, SetupPage } from './install';
import { InstallTitle, Trust } from './Cards';
import { EndCard, Streak } from './EndCard';
import { usePreloadSnapshots } from '../lib/Snapshot';

const YT_TITLE = `${VIDEO.title} - YouTube`;
const EXT_URL = 'chrome-extension://ggjhicjedlenjbdkdnajelmjcjiojjkm/options/options.html';
const EXT_NAME = 'Timestamped Summary for YouTube';

// ── Act 1/3 · YouTube ─────────────────────────────────────────────────────────────
export type Theme = 'dark' | 'light';
const YouTubeContent: React.FC<{ t: number; theme: Theme }> = ({ t, theme }) => {
  const cur = cursorAt(cursorTrack, t);
  const onBar = Math.abs(cur.y - BAR_Y) < 10 && cur.visible > 0.5;
  const lb = loadBar(t);
  const po = pageOpacity(t);
  return (
    <>
      <YouTubePage t={t} theme={theme} search={searchAt(t)} player={playerAt(t, onBar)} panel={<Panel t={t} theme={theme} view={panelAt(t)} />} home={homeOpacity(t)} suggest={suggestOpacity(t)} />
      {po < 1 && t >= T.enter ? <div style={{ position: 'absolute', left: 0, top: 56, right: 0, bottom: 0, background: theme === 'light' ? '#ffffff' : '#0f0f0f', opacity: 1 - po }} /> : null}
      {lb.o > 0 && t > T.enter ? <div style={{ position: 'absolute', left: 0, top: 0, height: 3, width: `${lb.w * 100}%`, background: '#ff0033', opacity: lb.o, boxShadow: '0 0 8px rgba(255,0,51,0.6)' }} /> : null}
    </>
  );
};

// ── Act 7 · YouTube again, summary open and following playback ─────────────────────
const TARGET = ALL_POINTS[TARGET_INDEX];
const OutroContent: React.FC<{ t: number; theme: Theme }> = ({ t, theme }) => {
  const sec = TARGET.sec + 52 + (t - T.outroIn);
  const view: PanelView = {
    mode: 'summary', level: { from: 2, to: 2, at: -10 }, summaryAt: -10, scrollTop: SCROLL_TO - 40,
    now: { index: TARGET_INDEX, progress: clamp((sec - TARGET.sec) / (ALL_POINTS[TARGET_INDEX + 1].sec - TARGET.sec)) },
  };
  return <YouTubePage t={t} theme={theme} search={{ text: VIDEO.query, caret: false, focused: false }} player={{ sec, playing: true, controls: 0, buildFrom: -1e9 }} panel={<Panel t={t} theme={theme} view={view} />} />;
};

// What the browser window shows at time t (the second film draws the same
// screens in light mode; the extension's own pages are dark-only, as they are).
export function windowAt(t: number, theme: Theme = 'dark'): { tabs: Tab[]; active: string; url: { host: string; path: string; secureChip?: string; typed?: { text: string; caret: boolean } | null }; content: React.ReactNode; download?: { visible: number; progress: number } | null } {
  if (t < T.settingsIn) {
    const loaded = t >= T.enter;
    return {
      tabs: [{ id: 'yt', title: loaded ? YT_TITLE : 'YouTube', favicon: 'youtube' }],
      active: 'yt', url: { host: 'youtube.com', path: loaded ? '/watch?v=Zt3v8kNq5bY' : '' },
      content: <YouTubeContent t={t} theme={theme} />,
    };
  }
  if (t < T.installIn) {
    return {
      tabs: [{ id: 'yt', title: YT_TITLE, favicon: 'youtube' }, { id: 'opt', title: EXT_NAME, favicon: 'extension', enter: T.openSettings }],
      active: 'opt', url: { host: EXT_URL, path: '', secureChip: EXT_NAME },
      content: <SettingsPage t={t} />,
    };
  }
  if (t < T.extEnter) {
    // Typing chrome://extensions into the omnibox from the GitHub tab.
    const typing = t >= T.typeExt - 0.15;
    const q = 'chrome://extensions';
    const n = Math.round(q.length * clamp((t - T.typeExt) / (T.extEnter - 0.15 - T.typeExt)));
    return {
      tabs: [{ id: 'gh', title: `Release ${RELEASE_TAG} · priyank1205/youtube-timestamped-summary`, favicon: 'github' }],
      active: 'gh',
      url: { host: 'github.com', path: `/priyank1205/youtube-timestamped-summary/releases/tag/${RELEASE_TAG}`, typed: typing ? { text: q.slice(0, n), caret: true } : null },
      content: <GitHubRelease t={t} theme={theme} />,
      download: t >= T.zipClick ? { visible: clamp((t - T.zipClick) / 0.2), progress: clamp((t - T.zipClick - 0.15) / 0.75) } : null,
    };
  }
  if (t < T.setupIn) {
    return {
      tabs: [{ id: 'ext', title: 'Extensions', favicon: 'extensions' }],
      active: 'ext', url: { host: 'chrome://extensions', path: '' },
      content: <ExtensionsPage t={t} theme={theme} />,
      download: { visible: 1, progress: 1 },
    };
  }
  if (t < T.outroIn) {
    return {
      tabs: [{ id: 'ext', title: 'Extensions', favicon: 'extensions' }, { id: 'setup', title: EXT_NAME, favicon: 'extension', enter: T.setupIn }],
      active: 'setup', url: { host: `${EXT_URL}#setup`, path: '', secureChip: EXT_NAME },
      content: <SetupPage t={t} />,
      download: { visible: 1, progress: 1 },
    };
  }
  return {
    tabs: [{ id: 'yt', title: YT_TITLE, favicon: 'youtube' }],
    active: 'yt', url: { host: 'youtube.com', path: '/watch?v=Zt3v8kNq5bY&t=4412s' },
    content: <OutroContent t={t} theme={theme} />,
  };
}

// Window-space extras drawn above the page (popups, the folder picker, highlights).
const WindowExtras: React.FC<{ t: number }> = ({ t }) => (
  <>
    {t < T.settingsIn ? <Spotlight id="spot-yt" {...spotlightAt(t)} /> : null}
    {t >= T.settingsIn && t < T.installIn ? <Spotlight id="spot-set" {...settingsSpotlight(t)} /> : null}
    <Popup t={t} />
    <DownloadBubble t={t} />
    {t >= T.extEnter && t < T.setupIn ? <FolderPicker t={t} /> : null}
    {t >= T.extEnter && t < T.setupIn ? <CardGlow t={t} /> : null}
  </>
);

// A red underline drawn under the video's length while the hook dwells on it.
const DurationMark: React.FC<{ t: number }> = ({ t }) => {
  const p = ease.outExpo(clamp((t - (T.capSomewhere + 0.15)) / 0.5));
  const o = 1 - clamp((t - 5.85) / 0.3);
  if (t < T.capSomewhere || o <= 0) return null;
  return <div style={{ position: 'absolute', left: 171, top: 697, width: 47 * p, height: 2.5, borderRadius: 2, background: '#ff3d4d', opacity: o, boxShadow: '0 0 6px rgba(255,61,77,0.8)' }} />;
};

const ScrubWords: React.FC<{ t: number }> = ({ t }) => {
  if (t < 6.3 || t > 10.6) return null;
  const out = ease.inCubic(clamp((t - 10.05) / 0.4));
  return (
    <div style={{ position: 'absolute', left: 104, top: 300, fontFamily: interTight, fontWeight: 800, fontSize: 104, lineHeight: 1.0, letterSpacing: '-0.04em', color: '#fff', opacity: 1 - out }}>
      {SCRUB_WORDS.map(([at, w], i) => {
        const p = ease.outExpo(clamp((t - at) / 0.45));
        const dim = t > at + 0.9 && i < SCRUB_WORDS.length - 1 ? 0.38 : 1;
        return (
          <div key={w} style={{ overflow: 'hidden', paddingBottom: 6 }}>
            <div style={{ transform: `translateY(${lerp(100, 0, p)}%)`, opacity: clamp((t - at) / 0.15) * dim, color: i === SCRUB_WORDS.length - 1 ? '#ff5c5c' : '#fff' }}>{w}</div>
          </div>
        );
      })}
    </div>
  );
};

const SpedUp: React.FC<{ t: number }> = ({ t }) => {
  const o = Math.min(clamp((t - (T.genClick + 0.25)) / 0.2), 1 - clamp((t - (T.summaryAt - 0.1)) / 0.2));
  if (o <= 0) return null;
  return (
    <div style={{ position: 'absolute', right: 40, top: 36, padding: '8px 14px', borderRadius: 999, background: 'rgba(20,20,22,0.72)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', fontFamily: interTight, fontWeight: 600, fontSize: 20, letterSpacing: '0.01em', opacity: o, display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg width="18" height="14" viewBox="0 0 18 14"><path d="M1 1l7 6-7 6zM9.5 1l7 6-7 6z" fill="rgba(255,255,255,0.85)" /></svg>Sped up
    </div>
  );
};

export const Film: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  usePreloadSnapshots();
  const t = useT();
  const cam = camera(t);
  // The world is hidden behind full-frame cards; blurred under the hook's question.
  const hidden = (t > T.revealIn + 0.6 && t < T.demoIn - 0.05) || (t > T.trustIn + 0.5 && t < T.step1 - 0.05) || t > T.endCard + 0.2;
  const qDim = clamp((t - T.question) / 0.6) * (1 - clamp((t - (T.revealIn + 0.2)) / 0.3));
  const blur = qDim * 7;
  const fadeIn = ease.css(clamp((t - T.fadeIn) / 0.6));
  const w = windowAt(t);
  // The setup guide hands over to YouTube with a quick dissolve.
  const handover = t < T.outroIn ? ease.inCubic(clamp((t - (T.outroIn - 0.35)) / 0.35)) : 1 - ease.outCubic(clamp((t - T.outroIn) / 0.45));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Wallpaper t={t} />
      {!hidden ? (
        <AbsoluteFill style={{ filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px) brightness(${(1 - 0.35 * qDim).toFixed(3)})` : undefined }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: 896, transformOrigin: '0 0', transform: transformFor(cam) }}>
            <ChromeWindow t={t} tabs={w.tabs} active={w.active} url={w.url} download={w.download}>
              {w.content}
            </ChromeWindow>
            <WindowExtras t={t} />
            <DurationMark t={t} />
            <Cursor track={cursorTrack} t={t} />
          </div>
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ background: 'radial-gradient(120% 120% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)', pointerEvents: 'none' }} />
      <AbsoluteFill style={{ background: '#000', opacity: handover * 0.9, pointerEvents: 'none' }} />
      <ScrubWords t={t} />
      {captionsYouTube.map((c, i) => <Caption key={i} c={c} t={t} />)}
      {captionsLater.map((c, i) => <Caption key={`l${i}`} c={c} t={t} />)}
      <SpedUp t={t} />
      <Reveal t={t} />
      <Trust t={t} />
      <InstallTitle t={t} />
      <Streak t={t} at={T.endCard - 0.55} />
      <EndCard t={t} />
      <AbsoluteFill style={{ background: '#000', opacity: 1 - fadeIn, pointerEvents: 'none' }} />
      {withAudio ? <Audio src={staticFile('audio/soundtrack.wav')} /> : null}
    </AbsoluteFill>
  );
};
