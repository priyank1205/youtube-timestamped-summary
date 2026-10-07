// Act 6: installing it, as the README describes — the release zip from GitHub
// (opened from Chrome's download bubble, which unzips it), chrome://extensions →
// Developer mode → Load unpacked → the unzipped folder in macOS's folder picker,
// then the setup guide. GitHub and chrome://extensions are real captures, the
// picker is rebuilt from captures of the real one, the guide is a snapshot.
import React from 'react';
import { Img, staticFile } from 'remotion';
import { T } from './T';
import { Snapshot } from '../lib/Snapshot';
import { clamp, ease, lerp, springAt } from '../lib/time';
import { interTight } from '../lib/fonts';
import { MacOpenPanel, OpenPanelSpec } from '../ui/MacOpenPanel';

const PAGE = 86;
// GitHub release page (CSS px of the full-page capture), measured on capture.
import release from '../data/github-release.json';
export const GH = { docH: release.docH, maxScroll: release.docH - 810, zip: release.zip };
// The release the film installs: its zip as GitHub lists it (192 KB), and the
// folder unzipping it makes.
export const DL = release.text.replace(/\.zip$/, '');
export const RELEASE_TAG = DL.replace(/^.*-(v[\d.]+)$/, '$1');
export const ZIP_KB = 192;
export const ghScroll = (t: number) => GH.maxScroll * ease.inOutCubic(clamp((t - T.scrollGH) / 1.55));
export const zipPoint = () => ({ x: GH.zip.x + 170, y: PAGE + GH.zip.y + GH.zip.h / 2 - GH.maxScroll });

export type Theme = 'dark' | 'light';
export const GitHubRelease: React.FC<{ t: number; theme?: Theme }> = ({ t, theme = 'dark' }) => {
  const sc = ghScroll(t);
  const hover = t >= T.zipClick - 0.35 && t < T.zipClick + 0.6;
  const light = theme === 'light';
  return (
    <div style={{ position: 'absolute', inset: 0, background: light ? '#ffffff' : '#0d1117', overflow: 'hidden' }}>
      <Img src={staticFile(light ? 'github/release-full-day.png' : 'github/release-full.png')} style={{ position: 'absolute', left: 0, top: -sc, width: 1440, height: GH.docH }} />
      {hover ? <div style={{ position: 'absolute', left: GH.zip.x, top: GH.zip.y - sc + GH.zip.h - 1.5, width: GH.zip.w, height: 1.2, background: light ? '#0969da' : '#4493f8' }} /> : null}
    </div>
  );
};

// Chrome's download bubble, under the toolbar's download icon. Clicking the
// finished download opens it — on macOS that unzips it next to the zip.
export const BUBBLE = { x: 936, y: 90, w: 372 };
export const bubbleRow = () => ({ x: BUBBLE.x + 196, y: BUBBLE.y + 66 });
const BUBBLE_C = {
  dark: { bg: '#2b2b2b', ring: '0 0 0 1px rgba(255,255,255,0.08), 0 14px 40px rgba(0,0,0,0.55)', text: '#e3e3e3', sub: '#c7c7c7', track: 'rgba(255,255,255,0.12)', bar: '#a8c7fa', hover: 'rgba(255,255,255,0.08)' },
  light: { bg: '#ffffff', ring: '0 0 0 1px rgba(0,0,0,0.06), 0 12px 36px rgba(0,0,0,0.16)', text: '#1f1f1f', sub: '#474747', track: 'rgba(31,31,31,0.12)', bar: '#0b57d0', hover: 'rgba(31,31,31,0.06)' },
};
export const DownloadBubble: React.FC<{ t: number; theme?: Theme }> = ({ t, theme = 'dark' }) => {
  const C = BUBBLE_C[theme];
  const a = T.zipClick + 0.15, b = T.openZip + 0.1;
  if (t < a || t > b + 0.3) return null;
  const p = ease.outCubic(clamp((t - a) / 0.18)) * (1 - clamp((t - b) / 0.2));
  const prog = clamp((t - a) / 0.75);
  const hover = clamp((t - (T.openZip - 0.32)) / 0.08);
  return (
    <div style={{ position: 'absolute', left: BUBBLE.x, top: BUBBLE.y, width: BUBBLE.w, borderRadius: 12, background: C.bg, boxShadow: C.ring, opacity: p, transform: `translateY(${(1 - p) * -6}px)`, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', padding: '14px 8px 10px' }}>
      <div style={{ fontSize: 13, color: C.text, fontWeight: 600, margin: '0 8px 8px' }}>Recent download history</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 8px', borderRadius: 8, background: hover > 0 ? C.hover : 'transparent', opacity: 1 }}>
        <Img src={staticFile('macos/icon-zip.png')} style={{ width: 32, height: 32, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{`${DL}.zip`}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>{prog < 1 ? `${Math.round(ZIP_KB * prog)} KB of ${ZIP_KB} KB` : `${ZIP_KB} KB • Done`}</div>
          <div style={{ height: 3, borderRadius: 2, background: C.track, marginTop: 6, overflow: 'hidden', opacity: prog < 1 ? 1 : 0 }}>
            <div style={{ width: `${prog * 100}%`, height: '100%', background: C.bar }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// chrome://extensions, in its three captured states.
export const EXT = { dev: { x: 1402 + 13, y: PAGE + 28 }, load: { x: 24 + 64, y: PAGE + 66 + 18 }, card: { x: 383.5, y: PAGE + 203, w: 400, h: 208 } };
export const ExtensionsPage: React.FC<{ t: number; theme?: Theme }> = ({ t, theme = 'dark' }) => {
  const dev = ease.css(clamp((t - T.devClick) / 0.2));
  const loaded = ease.css(clamp((t - T.cardIn) / 0.25));
  const light = theme === 'light', sfx = light ? '-day' : '';
  return (
    <div style={{ position: 'absolute', inset: 0, background: light ? '#ffffff' : '#1f1f1f' }}>
      <Img src={staticFile(`chrome/ext-devoff${sfx}.png`)} style={{ position: 'absolute', inset: 0, width: 1440, height: 810, opacity: 1 - dev }} />
      <Img src={staticFile(`chrome/ext-devon${sfx}.png`)} style={{ position: 'absolute', inset: 0, width: 1440, height: 810, opacity: dev * (1 - loaded) }} />
      <Img src={staticFile(`chrome/ext-loaded${sfx}.png`)} style={{ position: 'absolute', inset: 0, width: 1440, height: 810, opacity: loaded }} />
      {/* The toggle's knob sliding across while the page settles. */}
      {t >= T.devClick && t < T.devClick + 0.2 ? (
        <div style={{ position: 'absolute', left: 1402, top: 20, width: 26, height: 16, borderRadius: 8, background: light ? `rgba(11,87,208,${dev})` : `rgba(168,199,250,${dev})`, boxShadow: `inset 0 0 0 1.5px ${light ? '#747775' : '#8e918f'}` }}>
          <div style={{ position: 'absolute', top: 3, left: lerp(3, 13, dev), width: 10, height: 10, borderRadius: 5, background: light ? (dev > 0.5 ? '#ffffff' : '#747775') : (dev > 0.5 ? '#062e6f' : '#8e918f') }} />
        </div>
      ) : null}
    </div>
  );
};

// macOS's folder picker, as a sheet centred on the window (macOS 26 centres
// sheets; Chrome's own sheet offset no longer applies — checked against Chrome
// for Testing on 26.6). Opens on Downloads: the unzipped folder, the zip (dimmed:
// only folders can be chosen) and a few older downloads.
export const PICKER = { x: 206, y: 224, w: 1028, h: 448 };
const SIDE_W = 150;
const COL1 = PICKER.x + 8 + SIDE_W;
export const PICK = {
  folder: { x: COL1 + 37 + 66, y: PICKER.y + 127 + 11 },
  select: { x: PICKER.x + PICKER.w - 20 - 37, y: PICKER.y + 404 + 12 },
};
const press = (t: number, at: number) => (t >= at - 0.03 && t < at + 0.16 ? 1 - clamp((t - at - 0.06) / 0.1) : 0);

export function pickerSpec(t: number, theme: Theme = 'dark'): OpenPanelSpec {
  const loaded = t >= T.pickerIn + 0.2;
  const picked = t >= T.pickClick;
  const today = (n: string, icon: 'folder' | 'json' | 'text') => ({ icon, name: n, folder: icon === 'folder', disabled: icon !== 'folder' });
  return {
    theme, width: PICKER.w, message: 'Select the extension directory.', sidebarWidth: SIDE_W,
    sidebar: [
      { items: [{ icon: 'clock', label: 'Recents' }, { icon: 'folder.badge.person.crop', label: 'Shared' }] },
      { title: 'Favorites', items: [
        { icon: 'appstore', label: 'Applications' }, { icon: 'arrow.down.circle', label: 'Downloads', selected: true },
        { icon: 'doc', label: 'Documents' }, { icon: 'menubar.dock.rectangle', label: 'Desktop' },
      ] },
      { title: 'Locations', items: [{ icon: 'icloud', label: 'iCloud Drive' }, { icon: 'internaldrive', label: 'Macintosh HD' }] },
    ],
    path: picked ? { icon: 'folder', label: DL } : { icon: 'downloads', label: 'Downloads' },
    columns: [
      { groups: loaded ? [
        { title: 'Today', rows: [
          { icon: 'folder', name: DL, folder: true, sel: picked ? 'active' : undefined },
          { icon: 'zip', name: `${DL}.zip`, disabled: true },
        ] },
        { title: 'Previous 7 Days', rows: [
          { icon: 'pdf', name: 'boarding-pass.pdf', disabled: true },
          { icon: 'heic', name: 'IMG_2047.HEIC', disabled: true },
          { icon: 'pdf', name: 'invoice-0921.pdf', disabled: true },
        ] },
      ] : [] },
      ...(picked ? [{ groups: [{ title: 'Today', rows: [
        today('background', 'folder'), today('icons', 'folder'), today('LICENSE', 'text'), today('manifest.json', 'json'),
        today('options', 'folder'), today('popup', 'folder'), today('scripts', 'folder'), today('styles', 'folder'),
      ] }] }] : []),
    ],
    hScroll: null,
    selectPressed: press(t, T.selectClick),
  };
}

export const FolderPicker: React.FC<{ t: number; theme?: Theme }> = ({ t, theme = 'dark' }) => {
  const a = T.pickerIn, b = T.selectClick + 0.1;
  if (t < a || t > b + 0.25) return null;
  const inP = ease.outCubic(clamp((t - a) / 0.22));
  const outP = ease.inCubic(clamp((t - b) / 0.18));
  const sc = lerp(0.965, 1, inP) * lerp(1, 0.985, outP);
  return (
    <div style={{ position: 'absolute', left: PICKER.x, top: PICKER.y, width: PICKER.w, height: PICKER.h, opacity: inP * (1 - outP), transform: `scale(${sc})`, transformOrigin: '50% 45%', borderRadius: 26, boxShadow: '0 32px 90px rgba(0,0,0,0.55), 0 10px 28px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(0,0,0,0.9)' }}>
      <MacOpenPanel spec={pickerSpec(t, theme)} />
    </div>
  );
};

export const CardGlow: React.FC<{ t: number }> = ({ t }) => {
  const p = clamp((t - T.cardIn) / 0.5);
  const o = Math.min(p, 1 - clamp((t - (T.step3 - 0.4)) / 0.4));
  if (o <= 0) return null;
  return <div style={{ position: 'absolute', left: EXT.card.x - 4, top: EXT.card.y - 4, width: EXT.card.w + 8, height: EXT.card.h + 8, borderRadius: 14, boxShadow: `0 0 0 2px rgba(255,92,92,${0.85 * o}), 0 0 ${lerp(0, 40, p)}px rgba(255,60,80,${0.45 * o})`, pointerEvents: 'none' }} />;
};

// The first-run setup guide.
export function setupState(t: number): { name: string; start: number } {
  if (t < T.freeClick) return { name: 'setup-1', start: T.setupIn };
  if (t < T.pasteKey) return { name: 'setup-2', start: T.freeClick };
  if (t < T.connectClick) return { name: 'setup-2-typed', start: T.freeClick - 5 };
  if (t < T.allSet) return { name: 'setup-2-checking', start: T.freeClick - 5 };
  return { name: 'setup-3', start: T.allSet };
}
export const SetupPage: React.FC<{ t: number }> = ({ t }) => {
  const s = setupState(t);
  return <Snapshot name={s.name} t={t} start={s.start} width={1440} height={810} />;
};
export const SETUP = {
  free: { x: 910, y: PAGE + 349 },
  key: { x: 820, y: PAGE + 441 },
  connect: { x: 1116, y: PAGE + 441 },
  tryIt: { x: 754, y: PAGE + 587 },
};

// Step indicator for the install act, top-left in screen space.
const STEPS = ['Download', 'Load it in Chrome', 'Add a free key'];
export const StepRail: React.FC<{ t: number }> = ({ t }) => {
  const on = Math.min(ease.css(clamp((t - (T.step1 - 0.2)) / 0.4)), 1 - ease.css(clamp((t - (T.installOut - 0.5)) / 0.4)));
  if (on <= 0) return null;
  const cur = t < T.step2 ? 0 : t < T.step3 ? 1 : 2;
  return (
    <div style={{ position: 'absolute', left: 64, top: 52, display: 'flex', gap: 10, opacity: on, fontFamily: interTight }}>
      {STEPS.map((s, i) => {
        const active = i === cur, done = i < cur;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 10px 10px', borderRadius: 999, background: active ? '#3a1418' : '#141418', border: `1px solid ${active ? 'rgba(255,92,92,0.6)' : 'rgba(255,255,255,0.12)'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>
            <span style={{ width: 28, height: 28, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800, background: active ? '#ff5c5c' : done ? 'rgba(95,212,140,0.2)' : 'rgba(255,255,255,0.1)', color: active ? '#fff' : done ? '#6fe0a0' : 'rgba(255,255,255,0.6)' }}>{done ? '✓' : i + 1}</span>
            <span style={{ fontSize: 20, fontWeight: 650, color: active ? '#fff' : 'rgba(255,255,255,0.62)', letterSpacing: '-0.01em' }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
};
