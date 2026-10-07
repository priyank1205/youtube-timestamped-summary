// The second film's choreography. It runs on the first film's clock (film/T.ts),
// so the screen action — typing, the demo, settings, the install — is the same
// and the two films compare like for like. What changes is everything around it:
// the frame's layout on the page, the camera inside it, the editorial captions
// and the red pen.
import { T } from '../film/T';
import { ease } from '../lib/time';
import { barX, scrubFrac, BAR_Y, targetRow } from '../film/youtube';
import { GH, PICK, EXT, zipPoint } from '../film/install';
import { LAYOUT, framePath, Rect, Cam2 } from './style';
import type { PenMark } from './Pen';

// ── Where the frame sits on the page ──────────────────────────────────────────────
const shift = (r: Rect, dx: number): Rect => ({ ...r, x: r.x + dx });
export const frameAt = framePath(LAYOUT.right, [
  // act 1: the question typed beside the headline, then the page fills the sheet
  { at: 3.35, dur: 0.9, to: LAYOUT.full },
  { at: 10.9, dur: 0.6, to: { ...LAYOUT.right, x: 300, y: 1160, w: 1320, r: 30 }, e: ease.inCubic },
  // the demo slides in from the right
  { at: T.demoIn - 0.01, dur: 0.001, to: shift(LAYOUT.right, 1300) },
  { at: T.demoIn + 0.85, dur: 0.85, to: LAYOUT.right, e: ease.outCubic },
  // settings: the frame crosses to the left, captions to the right
  { at: 46.9, dur: 0.9, to: LAYOUT.left },
  // the small print: the frame leaves the page
  { at: 60.2, dur: 0.7, to: shift(LAYOUT.left, -1400), e: ease.inCubic },
  // install: back in from the right
  { at: T.step1 - 0.01, dur: 0.001, to: shift(LAYOUT.right, 1300) },
  { at: T.step1 + 0.8, dur: 0.8, to: LAYOUT.right, e: ease.outCubic },
  // the outro fills the sheet again
  { at: T.outroIn + 0.5, dur: 0.9, to: LAYOUT.full },
  // and slides off the bottom of the page for the end
  { at: T.endCard - 0.05, dur: 0.6, to: { ...LAYOUT.right, x: 300, y: 1160, w: 1320, r: 30 }, e: ease.inCubic },
]);
// The frame's own fade: out under the question, gone for the full-page beats.
export const frameOpacity = (t: number) => {
  if (t > 10.55 && t < T.demoIn) return Math.max(0, 1 - (t - 10.55) / 0.35);
  if (t > T.trustIn + 0.2 && t < T.step1) return 0;
  if (t > T.endCard - 0.3) return Math.max(0, 1 - (t - (T.endCard - 0.3)) / 0.32);
  return 1;
};

// ── The camera inside the frame (window space; z = frame px per window px) ────────
type Key = { at: number; dur: number; x?: number; y?: number; z?: number; e?: (x: number) => number };
function camPath(start: Cam2, ks: Key[]) {
  const keys = [...ks].sort((a, b) => a.at - b.at);
  return (t: number): Cam2 => {
    let c = start;
    for (const k of keys) {
      const to = { x: k.x ?? c.x, y: k.y ?? c.y, z: k.z ?? c.z };
      if (t >= k.at) { c = to; continue; }
      if (t > k.at - k.dur) {
        const p = (k.e || ease.camera)(Math.min(1, (t - (k.at - k.dur)) / k.dur));
        return { x: c.x + (to.x - c.x) * p, y: c.y + (to.y - c.y) * p, z: Math.exp(Math.log(c.z) + (Math.log(to.z) - Math.log(c.z)) * p) };
      }
      break;
    }
    return c;
  };
}

const row = targetRow();
export const camera2 = camPath({ x: 640, y: 270, z: 1.45 }, [
  // act 1
  { at: 3.35, dur: 0.9, x: 720, y: 452, z: 1.24 },
  { at: 4.85, dur: 0.6, x: 215, y: 694, z: 3.4 },
  { at: 6.2, dur: 0.95, x: 520, y: 470, z: 1.62 },
  // act 3 · the demo, beside its captions
  { at: T.demoIn, dur: 0.001, x: 720, y: 448, z: 0.77 },
  { at: 19.75, dur: 1.0, x: 1012, y: 410, z: 1.36 },
  { at: 20.45, dur: 0.75, x: 1150, y: 330, z: 2.0 },
  { at: 28.25, dur: 0.85, x: 1078, y: 500, z: 1.6 },
  { at: 31.65, dur: 0.7, x: 1172, y: row.y + row.h / 2, z: 2.15 },
  { at: 33.35, dur: 0.6, x: 720, y: 448, z: 0.8, e: ease.inOutQuart },
  { at: 36.75, dur: 0.75, x: 1176, y: 560, z: 2.05 },
  { at: 40.6, dur: 1.6, x: 1180, y: 590, z: 2.2 },
  { at: 43.0, dur: 0.9, x: 1100, y: 380, z: 1.7 },
  { at: 45.3, dur: 1.5, x: 720, y: 448, z: 0.77 },
  // act 4 · popup and settings, the frame on the left
  { at: 46.55, dur: 0.95, x: 1100, y: 262, z: 1.7 },
  { at: 48.75, dur: 0.8, x: 720, y: 448, z: 0.77 },
  { at: 49.95, dur: 0.95, x: 760, y: 590, z: 1.4 },
  { at: 52.85, dur: 0.8, x: 640, y: 450, z: 1.25 },
  { at: 56.3, dur: 0.85, x: 640, y: 430, z: 1.32 },
  { at: 59.7, dur: 1.2, x: 680, y: 430, z: 1.2 },
  // act 6 · install
  { at: T.step1, dur: 0.001, x: 720, y: 448, z: 0.77 },
  { at: 69.5, dur: 1.2, x: 560, y: 600, z: 1.6 },
  { at: 70.45, dur: 0.6, x: 1080, y: 292, z: 1.6 },
  { at: 71.95, dur: 0.6, x: 600, y: 262, z: 1.8 },
  { at: 73.5, dur: 0.75, x: 1100, y: 262, z: 1.7 },
  { at: 74.75, dur: 0.75, x: 420, y: 332, z: 1.5 },
  { at: 75.55, dur: 0.6, x: 720, y: 448, z: 1.07 },
  { at: 76.15, dur: 0.6, x: 560, y: 452, z: 1.72 },
  { at: 77.35, dur: 0.75, x: 905, y: 520, z: 1.45 },
  { at: 78.3, dur: 0.65, x: 640, y: 420, z: 1.3 },
  { at: 79.9, dur: 0.45, x: 720, y: 448, z: 0.77 },
  { at: 80.45, dur: 0.75, x: 900, y: 440, z: 1.4 },
  { at: 81.4, dur: 0.6, x: 900, y: 500, z: 1.45 },
  { at: 83.35, dur: 0.8, x: 860, y: 470, z: 1.15 },
  { at: 85.9, dur: 0.6, x: 800, y: 560, z: 1.4 },
  // act 7 · the outro, full sheet, easing toward the panel
  { at: T.outroIn + 0.5, dur: 0.9, x: 720, y: 452, z: 1.24 },
  { at: 92.0, dur: 3.0, x: 960, y: 440, z: 1.5, e: ease.inOutCubic },
]);

// ── Column captions ────────────────────────────────────────────────────────────────
export type Col = { at: number; out: number; kicker?: string; num?: string; head: string[]; body?: string; strike?: string; side?: 'left' | 'right'; size?: number; step?: string };
export const COLUMN: Col[] = [
  { at: 0.25, out: 2.45, kicker: 'A short film', head: ['You had', '*one* question.'], size: 104 },
  // the demo
  { at: T.capSidebar, out: 20.3, num: '01', kicker: 'Where it lives', head: ['Right there,', 'in the *sidebar.*'] },
  { at: T.capDepth, out: 24.6, num: '02', kicker: 'Detail', head: ['Choose how', '*deep* it goes.'], body: 'Brief, Standard or In-depth — scaled to the length of the video.' },
  { at: T.capOneClick, out: 27.55, num: '03', kicker: 'One click', head: ['It reads', 'the *whole* thing.'], body: 'Shown sped up. It takes a little longer for real.' },
  { at: T.capOverview, out: 31.6, num: '04', kicker: 'Overview', head: ['An overview,', 'then *chapters.*'], body: 'Every line is linked to its moment in the video.' },
  { at: T.capThere, out: 36.1, num: '05', kicker: 'Jump', head: ['Click a line.', 'The video', '*goes there.*'] },
  { at: T.capDetail, out: 39.35, num: '06', kicker: 'Detail', head: ['Open any point', 'for the *detail.*'] },
  { at: T.capFound, out: 42.6, head: ['Answered in', '*under a minute.*'], strike: 'Not 2 hours 47 minutes.' },
  { at: T.capFold, out: 45.8, num: '07', kicker: 'Fold', head: ['Fold it away', 'while you *watch.*'] },
  // settings — captions on the right
  { at: T.capYours, out: 49.85, kicker: 'Settings', head: ['Make it', '*yours.*'], side: 'right', size: 96 },
  { at: T.capLive, out: 52.4, num: '08', kicker: 'Live preview', head: ['Detail, theme', 'and design,', '*previewed live.*'], side: 'right' },
  { at: T.capAI, out: 55.6, num: '09', kicker: 'Your AI', head: ['Bring your', '*own* AI.'], body: 'Google Gemini has a free tier. Or use OpenAI, Anthropic, or any OpenAI-compatible endpoint — even a model on your own machine.', side: 'right' },
  { at: T.capUsage, out: 59.4, num: '10', kicker: 'Your usage', head: ['See the hours', 'you *got back.*'], body: 'Counted on your machine. Never sent anywhere.', side: 'right' },
  // install — a step at a time
  { at: 67.6, out: 71.3, step: '1', kicker: 'Download', head: ['Get the', 'latest *release.*'], body: 'Download the .zip from GitHub, then unzip it.' },
  { at: 71.75, out: 74.45, step: '2', kicker: 'Load it in Chrome', head: ['Open', '*chrome://extensions*'], body: 'Turn on Developer mode, top right.', size: 72 },
  { at: 74.65, out: 78.75, step: '2', kicker: 'Load it in Chrome', head: ['Load *unpacked*,', 'pick the folder.'], body: 'Choose the folder you just unzipped.', size: 72 },
  { at: 79.6, out: 85.75, step: '3', kicker: 'Add a free key', head: ['Paste a free', '*Gemini* key.'], body: 'That’s it. The panel is waiting on any YouTube video.' },
];

// ── The red pen ──────────────────────────────────────────────────────────────────
const SCRUB_NOTE = (at: number, text: string, rot = -3): PenMark => ({ kind: 'note', at, out: 9.95, x: barX(scrubFrac(at + 0.15)), y: BAR_Y - 46, text, size: 26, align: 'center', rot, dur: 0.45, tab: true });
export const PEN: PenMark[] = [
  // the hook
  { kind: 'underline', at: 3.55, out: 4.4, x: 16, y: 86 + 640 + 33, len: 600, w: 3.2 },
  { kind: 'note', at: 3.7, out: 4.4, x: 636, y: 86 + 640 + 16, text: '← the answer’s in here', size: 30, rot: -2 },
  { kind: 'circle', at: 4.95, out: 5.95, cx: 194, cy: 690, rx: 31, ry: 13, w: 1.5, dur: 0.45 },
  { kind: 'note', at: 5.2, out: 5.95, x: 196, y: 648, text: 'somewhere in here.', size: 15, rot: -3, dur: 0.5, align: 'center', tab: true },
  SCRUB_NOTE(6.55, 'skim…', -4), SCRUB_NOTE(7.35, 'guess…', 3), SCRUB_NOTE(8.15, 'back…', -2), SCRUB_NOTE(8.95, 'again…', 4),
  // the jump: from the row to the player
  { kind: 'arrow', at: 33.05, out: 35.85, from: [row.x - 10, row.y + row.h / 2], to: [600, 420], bend: 0.2, w: 4.5, dur: 0.5 },
  { kind: 'note', at: 33.45, out: 35.85, x: 640, y: 520, text: 'right there.', size: 44, rot: -4, tab: true, align: 'center' },
  // install
  { kind: 'circle', at: T.zipClick + 0.15, out: 70.4, cx: GH.zip.x + GH.zip.w / 2, cy: zipPoint().y, rx: GH.zip.w / 2 + 18, ry: 18, w: 2.4 },
  { kind: 'circle', at: T.loadClick + 0.05, out: 75.35, cx: EXT.load.x, cy: EXT.load.y, rx: 80, ry: 27, w: 2.6 },
  { kind: 'circle', at: T.pickClick + 0.1, out: 77.15, cx: PICK.folder.x - 10, cy: PICK.folder.y, rx: 150, ry: 17, w: 2.4, dur: 0.45 },
  { kind: 'note', at: T.pickClick + 0.35, out: 77.15, x: PICK.folder.x - 10, y: PICK.folder.y + 46, text: 'the unzipped folder', size: 22, align: 'center', rot: -2 },
  { kind: 'circle', at: T.cardIn + 0.2, out: 79.0, cx: EXT.card.x + EXT.card.w / 2, cy: EXT.card.y + EXT.card.h / 2, rx: EXT.card.w / 2 + 34, ry: EXT.card.h / 2 + 26, w: 3, dur: 0.6 },
];

// ── Running header: the page furniture of the sheet ────────────────────────────────
export const SECTIONS: Array<[number, string]> = [
  [0, 'I · The question'], [T.revealIn, 'II · The answer'], [T.demoIn, 'III · How it works'], [46.2, 'IV · Make it yours'],
  [T.trustIn, 'V · The small print'], [T.installIn, 'VI · Install'], [T.outroIn, 'VII · Back to the video'],
];
