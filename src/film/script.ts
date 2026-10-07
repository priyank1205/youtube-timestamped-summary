// Choreography: camera path, pointer track and captions for the whole film, in
// window space (the browser window's CSS pixels; the page starts at y = 86).
import { T } from './T';
import { path, Cam } from './camera';
import { ease } from '../lib/time';
import type { CursorTrack } from './cursor';
import type { CaptionSpec } from './Caption';
import { C, R, BAR_Y, barX, scrubFrac, SCRUB_KEYS, targetRow, targetChev } from './youtube';
import { POPUP } from './settings';
import { EXT, PICK, SETUP, bubbleRow, zipPoint } from './install';

const PAGE_Y = 86; // window y of the page's top edge (tab strip + toolbar)

// ── Framings ────────────────────────────────────────────────────────────────────
const search = C('empty', 'search');
export const F: Record<string, Cam> = {
  search: { x: 536, y: 236, z: 1.92 },
  split: { x: 380, y: 452, z: 0.86 },
  duration: { x: 214, y: 702, z: 4.1 },
  scrub: { x: 242, y: 440, z: 1.15 },
  toSidebar: { x: 1080, y: 360, z: 1.55 },
  full: { x: 720, y: 448, z: 1.13 },
  sidebar: { x: 1050, y: 372, z: 1.52 },
  panel: { x: 1172, y: 300, z: 2.2 },
  panelFull: { x: 1150, y: 486, z: 1.56 },
  row: { x: 1172, y: 506, z: 2.25 },
  player: { x: 724, y: 452, z: 1.2 },
  row2: { x: 1338, y: 548, z: 2.05 },
  desc: { x: 1352, y: 560, z: 2.25 },
  header: { x: 1120, y: 360, z: 1.7 },
};

export const camera = path(F.search, [
  { at: T.enter, dur: T.enter, z: 2.0, e: ease.linear },
  { at: 3.95, dur: 1.1, ...F.split },
  { at: 4.85, dur: 0.6, ...F.duration },
  { at: 6.2, dur: 0.95, ...F.scrub },
  { at: 13.7, dur: 3.5, ...F.toSidebar, e: ease.inOutCubic },
  // after the reveal
  { at: T.demoIn, dur: 0.001, x: 720, y: 470, z: 0.9, rx: 14, ry: -18 },
  { at: 18.75, dur: 1.15, ...F.full, e: ease.outCubic },
  { at: 19.75, dur: 1.0, ...F.sidebar },
  { at: 20.45, dur: 0.85, ...F.panel },
  { at: 28.25, dur: 0.85, ...F.panelFull },
  { at: 31.65, dur: 0.7, ...F.row },
  { at: 33.35, dur: 0.55, ...F.player, e: ease.inOutQuart },
  { at: 36.75, dur: 0.75, ...F.row2 },
  { at: 40.6, dur: 1.6, ...F.desc },
  { at: 43.0, dur: 0.9, ...F.header },
  { at: 45.3, dur: 1.5, ...F.full },
  // act 4 · popup and settings
  { at: 46.55, dur: 0.95, x: 1150, y: 216, z: 2.0 },
  { at: 48.75, dur: 0.8, ...F.full },
  { at: 49.95, dur: 0.95, x: 850, y: 600, z: 1.45 },
  { at: 52.85, dur: 0.8, x: 640, y: 430, z: 1.42 },
  { at: 56.3, dur: 0.85, x: 660, y: 400, z: 1.5 },
  { at: 59.7, dur: 1.2, x: 680, y: 420, z: 1.42 },
  // act 6 · install
  { at: T.step1, dur: 0.001, x: 720, y: 470, z: 0.92, rx: 12, ry: 16 },
  { at: 68.3, dur: 0.9, ...F.full, e: ease.outCubic },
  { at: 69.5, dur: 1.2, x: 610, y: 650, z: 1.55 },
  { at: 70.45, dur: 0.6, x: 1080, y: 300, z: 1.55 },
  { at: 71.95, dur: 0.6, x: 560, y: 160, z: 1.9 },
  { at: 73.5, dur: 0.75, x: 1080, y: 240, z: 1.65 },
  { at: 74.75, dur: 0.75, x: 540, y: 330, z: 1.45 },
  // the folder picker: settle on it, lean into Downloads, then over to Select
  { at: 75.55, dur: 0.6, x: 720, y: 448, z: 1.5 },
  { at: 76.15, dur: 0.6, x: 600, y: 470, z: 1.85 },
  { at: 77.35, dur: 0.75, x: 860, y: 515, z: 1.62 },
  { at: 78.3, dur: 0.65, x: 660, y: 420, z: 1.45 },
  { at: 79.9, dur: 0.45, ...F.full },
  { at: 80.45, dur: 0.75, x: 900, y: 430, z: 1.5 },
  { at: 81.4, dur: 0.6, x: 900, y: 500, z: 1.55 },
  { at: 83.35, dur: 0.8, x: 860, y: 476, z: 1.3 },
  { at: 85.9, dur: 0.6, x: 820, y: 560, z: 1.55 },
  // act 7 · outro
  { at: T.outroIn, dur: 0.001, x: 720, y: 460, z: 0.95, rx: 10, ry: -14 },
  { at: 89.2, dur: 1.2, ...F.full, e: ease.outCubic },
  { at: 92.4, dur: 3.2, x: 980, y: 430, z: 1.42, e: ease.inOutCubic },
]);

// ── Pointer ───────────────────────────────────────────────────────────────────────
const chip = C('empty', 'chip');
const gen = C('empty', 'generate');
const stop0 = C('pop', 'stop-0');
const stop2 = C('pop', 'stop-2');
const row = targetRow();
const chev = targetChev();
const title = C('summary', 'title');
const lastScrub = SCRUB_KEYS[SCRUB_KEYS.length - 1];

export const cursorTrack: CursorTrack = {
  start: { x: 560, y: 520 },
  show: [[5.5, 10.25], [19.6, 59.5], [67.6, 71.65], [73.1, 87.5]],
  moves: [
    { at: 6.18, dur: 0.6, x: barX(0) + 4, y: BAR_Y, hand: true },
    { at: lastScrub[0] + 0.06, dur: 0.001, x: barX(lastScrub[1]), y: BAR_Y, hand: true },
    { at: 10.1, dur: 0.45, x: barX(lastScrub[1]) + 40, y: BAR_Y - 90 },
    // the demo
    { at: 19.65, dur: 0.001, x: 1335, y: 660 },
    { at: T.chipClick - 0.15, dur: 0.75, x: chip.x, y: chip.y, hand: true },
    { at: T.briefClick - 0.15, dur: 0.75, x: stop0.x, y: stop0.y, hand: true },
    { at: T.indepthClick - 0.15, dur: 0.7, x: stop2.x, y: stop2.y, hand: true },
    { at: T.chipClose - 0.15, dur: 0.7, x: chip.x + 6, y: chip.y, hand: true },
    { at: T.genClick - 0.15, dur: 0.7, x: gen.x - 20, y: gen.y + 2, hand: true },
    { at: T.genClick + 0.85, dur: 0.6, x: 1335, y: 470 },
    { at: T.scrollStart - 0.05, dur: 0.75, x: 1262, y: 640 },
    { at: T.rowHover - 0.05, dur: 0.45, x: 1208, y: row.y + row.h / 2 + 1, hand: true },
    { at: T.expandClick - 0.15, dur: 0.65, x: chev.x - 1, y: chev.y + 1, hand: true },
    { at: T.expandClick + 0.85, dur: 0.6, x: 1318, y: 700 },
    { at: T.collapseClick - 0.15, dur: 0.85, x: title.x + 18, y: title.y + 2, hand: true },
    { at: T.collapseClick + 1.3, dur: 0.9, x: 860, y: 430 },
    // act 4
    { at: T.iconClick - 0.15, dur: 0.95, x: 1294, y: 64 },
    { at: T.openSettings - 0.15, dur: 0.75, x: POPUP.x + 160, y: POPUP.y + 227, hand: true },
    { at: 49.0, dur: 0.8, x: 760, y: 640 },
    { at: T.lightClick - 0.15, dur: 0.75, x: 586, y: 506, hand: true },
    { at: T.darkClick - 0.15, dur: 0.6, x: 795, y: 506, hand: true },
    { at: T.aiClick - 0.15, dur: 0.75, x: 118, y: 250, hand: true },
    { at: 53.5, dur: 0.75, x: 600, y: 420 },
    { at: T.usageClick - 0.15, dur: 0.85, x: 118, y: 297, hand: true },
    { at: 56.7, dur: 0.75, x: 560, y: 500 },
    // act 6
    { at: 67.6, dur: 0.001, x: 980, y: 520 },
    { at: T.zipClick - 0.15, dur: 0.85, x: zipPoint().x, y: zipPoint().y, hand: true },
    { at: T.openZip - 0.12, dur: 0.8, x: bubbleRow().x, y: bubbleRow().y },
    { at: T.openZip + 0.55, dur: 0.45, x: 1010, y: 330 },
    { at: 73.1, dur: 0.001, x: 980, y: 420 },
    { at: T.devClick - 0.15, dur: 0.8, x: EXT.dev.x, y: EXT.dev.y, hand: true },
    { at: T.loadClick - 0.15, dur: 0.85, x: EXT.load.x, y: EXT.load.y, hand: true },
    { at: T.pickClick - 0.12, dur: 0.9, x: PICK.folder.x, y: PICK.folder.y },
    { at: T.selectClick - 0.12, dur: 0.85, x: PICK.select.x, y: PICK.select.y },
    { at: T.selectClick + 0.8, dur: 0.6, x: 760, y: 600 },
    { at: T.freeClick - 0.15, dur: 0.9, x: SETUP.free.x, y: SETUP.free.y, hand: true },
    { at: T.pasteKey - 0.2, dur: 0.7, x: SETUP.key.x, y: SETUP.key.y },
    { at: T.connectClick - 0.15, dur: 0.55, x: SETUP.connect.x, y: SETUP.connect.y, hand: true },
    { at: T.connectClick + 0.9, dur: 0.6, x: 1000, y: 650 },
    { at: T.tryClick - 0.15, dur: 0.9, x: SETUP.tryIt.x, y: SETUP.tryIt.y, hand: true },
  ],
  follow: [
    { from: 6.18, to: lastScrub[0] + 0.05, at: (t) => ({ x: barX(scrubFrac(t)), y: BAR_Y }), hand: true },
  ],
  clicks: [6.2, T.chipClick, T.briefClick, T.indepthClick, T.chipClose, T.genClick, T.seekClick, T.expandClick, T.collapseClick,
    T.iconClick, T.openSettings, T.lightClick, T.darkClick, T.aiClick, T.usageClick,
    T.zipClick, T.openZip, T.devClick, T.loadClick, T.pickClick, T.selectClick, T.freeClick, T.pasteKey - 0.12, T.connectClick, T.tryClick],
};
void PAGE_Y;
void R;

// ── Captions (acts 1 and 3) ────────────────────────────────────────────────────────
export const captionsYouTube: CaptionSpec[] = [
  { at: T.capAnswer, out: 4.35, text: 'The answer’s in this video.', pos: 'left', size: 70, width: 560, scrim: 0.0 },
  { at: T.capSomewhere, out: 5.95, text: 'Somewhere in *2 hours 47 minutes.*', pos: 'tl', size: 72, width: 1300, scrim: 0.3 },
  { at: T.question, out: 13.4, text: 'What if you could *read it first?*', pos: 'center', size: 86, width: 1400, scrim: 0.7 },
  { at: T.capSidebar, out: 20.15, text: 'It lives right in YouTube’s sidebar.', pos: 'bl', size: 60, width: 600 },
  { at: T.capDepth, out: 23.55, text: 'Choose how deep it goes.', sub: 'Brief, Standard or In-depth — scaled to the video’s length.', pos: 'bl', size: 60, width: 560 },
  { at: T.capOneClick, out: 27.05, text: 'One click.', pos: 'bl', size: 64, width: 700 },
  { at: T.capOverview, out: 29.6, text: 'An overview, then chapters linked to the video.', pos: 'bl', size: 58, width: 600 },
  { at: T.capThere, out: 32.65, text: 'There it is.', pos: 'bl', size: 64, width: 700 },
  { at: T.capJump, out: 35.9, text: 'Click any line. The video *jumps right there.*', pos: 'bottom', size: 58, width: 1500, y: 64, scrim: 0.55 },
  { at: T.capDetail, out: 39.35, text: 'Open any point for the detail.', pos: 'right', size: 64, width: 560, scrim: 0.25 },
  { at: T.capFound, out: 42.55, text: '*Answered* in under a minute.', sub: 'Not 2 hours 47 minutes.', strike: true, pos: 'right', size: 70, width: 600, scrim: 0.25 },
  { at: T.capFold, out: 45.75, text: 'Fold it away while you watch.', pos: 'bl', size: 60, width: 600 },
];

export const captionsLater: CaptionSpec[] = [
  { at: T.capYours, out: 49.85, text: 'Make it yours.', pos: 'bl', size: 76, width: 640 },
  { at: T.capLive, out: 52.3, text: 'Detail, theme and design — *previewed live.*', pos: 'bl', size: 58, width: 660 },
  { at: T.capAI, out: 55.5, text: 'Bring your own AI.', sub: 'Google Gemini has a free tier. Or use OpenAI, Anthropic, or any OpenAI-compatible endpoint — even a model on your own machine.', pos: 'right', size: 62, width: 600, scrim: 0.4 },
  { at: T.capUsage, out: 59.35, text: 'See the hours *you got back.*', sub: 'Counted on your machine. Never sent anywhere.', pos: 'right', size: 62, width: 520, scrim: 0.4 },
  { at: 67.6, out: 71.3, text: 'Download the latest release, then unzip it.', pos: 'bottom', size: 50, width: 1500, y: 60, scrim: 0.7, step: 1 },
  { at: 71.75, out: 74.45, text: 'Open *chrome://extensions* and turn on Developer mode.', pos: 'bottom', size: 50, width: 1600, y: 60, scrim: 0.7, step: 2 },
  { at: 74.65, out: 78.75, text: 'Then Load unpacked, and pick the *unzipped folder.*', pos: 'bottom', size: 50, width: 1600, y: 60, scrim: 0.55, step: 2 },
  { at: 79.6, out: 85.75, text: 'Paste a free Google Gemini key. *That’s it.*', pos: 'bottom', size: 50, width: 1500, y: 60, scrim: 0.7, step: 3 },
  { at: T.capClosing, out: 91.7, text: 'An hour-long video shouldn’t need *an hour to evaluate.*', pos: 'bottom', size: 60, width: 1600, y: 76, scrim: 0.7 },
];

export const SCRUB_WORDS: Array<[number, string]> = [[6.5, 'Scrub.'], [7.5, 'Skim.'], [8.5, 'Guess.'], [9.5, 'Repeat.']];
