// The YouTube tab across the hook, the demo and the outro: what the page, the
// player and the extension panel are doing at any moment.
import layout from '../data/layout.json';
import { T } from './T';
import { ALL_POINTS, TARGET_INDEX, VIDEO } from '../data/video';
import { clamp, ease, keys, lerp, rand } from '../lib/time';
import type { PanelView } from '../ui/Panel';
import type { PlayerState, SearchState } from '../ui/YouTubePage';

type Rect = [number, number, number, number];
const L = layout as unknown as Record<string, Record<string, Rect>>;
export const R = (probe: string, key: string): Rect => L[probe][key];
export const C = (probe: string, key: string) => { const [x, y, w, h] = R(probe, key); return { x: x + w / 2, y: y + h / 2 }; };

// ── Typing the question ─────────────────────────────────────────────────────────
const QUERY = VIDEO.query;
export const KEY_TIMES: number[] = (() => {
  const out: number[] = [];
  const span = T.typeEnd - T.typeStart;
  // Uneven gaps, a little longer around spaces, like real typing.
  const w = QUERY.split('').map((ch, i) => (ch === ' ' ? 1.6 : 0.8 + rand(i * 7.1) * 0.6));
  const total = w.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < QUERY.length; i++) { acc += w[i]; out.push(T.typeStart + (acc / total) * span); }
  return out;
})();

export function searchAt(t: number): SearchState {
  const n = KEY_TIMES.filter((k) => k <= t).length;
  const typing = t >= T.typeStart - 0.3 && t < T.enter;
  const blink = Math.floor((t - T.typeEnd) / 0.53) % 2 === 0;
  return {
    text: QUERY.slice(0, n),
    caret: typing && (t < T.typeEnd + 0.05 || blink),
    focused: t < T.enter + 0.05,
  };
}

// ── Scrubbing ──────────────────────────────────────────────────────────────────
export const SCRUB_KEYS: Array<[number, number]> = [
  [6.25, 0.0], [7.0, 0.58], [7.65, 0.2], [8.4, 0.83], [9.1, 0.3], [9.65, 0.24],
];
export const scrubFrac = (t: number) => keys(t, SCRUB_KEYS.map(([a, b]) => [a, b, ease.inOutCubic] as [number, number, typeof ease.inOutCubic]));
export const BAR = R('empty', 'bar');           // window-space progress bar
export const barX = (frac: number) => BAR[0] + frac * BAR[2];
export const BAR_Y = BAR[1] + BAR[3] / 2;

// ── The target row, once the list has scrolled ─────────────────────────────────
export const SCROLL_TO = 1380;
export const scrollAt = (t: number) => SCROLL_TO * ease.inOutCubic(clamp((t - T.scrollStart) / (T.scrollEnd - T.scrollStart)));
const TARGET = ALL_POINTS[TARGET_INDEX];
const NEXT = ALL_POINTS[TARGET_INDEX + 1];
export const targetRow = () => { const [x, y, w, h] = R('summary', `row-${TARGET_INDEX}`); return { x, y: y - SCROLL_TO, w, h }; };
export const targetChev = () => { const c = C('summary', `chev-${TARGET_INDEX}`); return { x: c.x, y: c.y - SCROLL_TO }; };

// ── Playback ───────────────────────────────────────────────────────────────────
const PAUSED_AT = 0.47 * VIDEO.duration;
export function playheadAt(t: number) {
  if (t < T.scrubIn + 0.25) return 0;
  if (t < T.seekLand) return scrubFrac(t) * VIDEO.duration;
  return TARGET.sec + Math.max(0, t - (T.seekLand + 0.32));
}
void PAUSED_AT;

export function playerAt(t: number, cursorOnBar: boolean): PlayerState {
  const sec = playheadAt(t);
  const playing = t >= T.seekLand + 0.32;
  // Chrome: shown while paused, during the scrub, and for a few seconds after the
  // jump so the playhead landing reads; then YouTube hides it while playing.
  let controls = 1;
  if (playing) controls = 1 - ease.css(clamp((t - (T.seekLand + 3.2)) / 0.35));
  if (t > T.collapseClick + 1.2) controls = 0;
  const scrubbing = t >= T.scrubIn + 0.2 && t <= T.scrubOut - 0.15;
  const scrubAmt = scrubbing ? Math.min(clamp((t - T.scrubIn - 0.2) / 0.15), clamp((T.scrubOut - 0.15 - t) / 0.2)) : 0;
  return {
    sec,
    playing,
    controls,
    barHover: cursorOnBar || scrubbing ? 1 : 0,
    scrub: scrubAmt > 0 ? { frac: scrubFrac(t), amt: scrubAmt } : null,
    buffering: t >= T.seekLand && t < T.seekLand + 0.34 ? 1 : 0,
    buildFrom: TARGET.sec + 0.15,
  };
}

// ── The panel ──────────────────────────────────────────────────────────────────
const GEN_LABELS: Array<[number, string]> = [
  [0, 'Extracting transcript...'],
  [0.5, 'Trying Google Gemini...'],
  [0.95, 'Generating summary... 1/4 parts'],
  [1.35, 'Generating summary... 2/4 parts'],
  [1.75, 'Generating summary... 3/4 parts'],
  [2.15, 'Generating summary... 4/4 parts'],
];

const hoverAmt = (t: number, from: number, to: number, fade = 0.15) =>
  Math.min(ease.css(clamp((t - from) / fade)), 1 - ease.css(clamp((t - to) / fade)));

export function panelAt(t: number): PanelView {
  const level = t < T.briefClick ? { from: 1, to: 1, at: -10 }
    : t < T.indepthClick ? { from: 1, to: 0, at: T.briefClick }
      : { from: 0, to: 2, at: T.indepthClick };
  if (t < T.summaryAt) {
    const gen = t >= T.genClick ? { since: T.genClick, label: GEN_LABELS.filter(([d]) => t - T.genClick >= d).pop()![1] } : null;
    return {
      mode: 'empty',
      level,
      chipHover: hoverAmt(t, T.chipClick - 0.25, T.chipClick + 0.4) + hoverAmt(t, T.chipClose - 0.2, T.chipClose + 0.3),
      pop: t >= T.chipClick && t < T.chipClose ? {
        openedAt: T.chipClick, closeAt: T.chipClose,
        stopHover: [hoverAmt(t, T.briefClick - 0.2, T.briefClick + 0.5), 0, hoverAmt(t, T.indepthClick - 0.2, T.indepthClick + 0.55)],
      } : null,
      gen,
      genHover: gen ? 0 : hoverAmt(t, T.genClick - 0.3, T.genClick + 0.2),
      genPress: Math.max(0, 1 - Math.abs(t - T.genClick) / 0.12),
    };
  }
  const nowActive = t >= T.seekLand;
  const nextSec = NEXT ? NEXT.sec : VIDEO.duration;
  return {
    mode: 'summary',
    level,
    summaryAt: T.summaryAt,
    scrollTop: scrollAt(t),
    hover: t >= T.rowHover - 0.15 && t < T.expandClick + 0.6 ? { index: TARGET_INDEX, amt: hoverAmt(t, T.rowHover - 0.15, T.expandClick + 0.6) } : null,
    pulse: t >= T.seekClick ? { index: TARGET_INDEX, at: T.seekClick } : null,
    now: nowActive ? { index: TARGET_INDEX, progress: clamp((playheadAt(t) - TARGET.sec) / (nextSec - TARGET.sec)) } : null,
    expand: t >= T.expandClick ? { index: TARGET_INDEX, at: T.expandClick } : null,
    collapse: t >= T.collapseClick ? { at: T.collapseClick } : null,
  };
}

// YouTube's red navigation bar across the top of the page while it loads.
export const loadBar = (t: number) => ({
  w: ease.outCubic(clamp((t - T.enter) / 0.45)),
  o: 1 - clamp((t - T.enter - 0.45) / 0.2),
});

export const pageOpacity = (t: number) => ease.css(clamp((t - T.pageIn) / 0.3));
// Before the search lands: YouTube's home feed, and the suggestions dropdown.
export const homeOpacity = (t: number) => 1 - ease.css(clamp((t - (T.enter + 0.08)) / 0.12));
export const suggestOpacity = (t: number) => (t >= T.typeStart + 0.12 && t < T.enter + 0.06 ? 1 : 0);

// Small helper for scenes: linear position on the bar for a fraction.
export const barPoint = (frac: number) => ({ x: barX(frac), y: BAR_Y });
export const lerpPt = (a: { x: number; y: number }, b: { x: number; y: number }, k: number) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

// ── Spotlight on the extension during the demo ─────────────────────────────────
import type { Hole } from './Spotlight';
const PANEL_EMPTY: Hole = [1024, 150, 404, 228];
const PANEL_POP: Hole = [1024, 150, 404, 272];
const PANEL_FULL: Hole = [1024, 150, 404, 668];
const PANEL_HEAD: Hole = [1024, 150, 404, 56];
const PLAYER: Hole = [12, 150, 1004, 568];
export function spotlightAt(t: number): { holes: Hole[]; amount: number } {
  const on = Math.min(ease.css(clamp((t - (T.capSidebar - 0.3)) / 0.6)), 1 - ease.css(clamp((t - (T.collapseClick + 0.7)) / 0.6)));
  const mix = (a: Hole, b: Hole, t0: number, d = 0.35) => { const k = ease.inOutCubic(clamp((t - t0) / d)); return a.map((v, i) => v + (b[i] - v) * k) as Hole; };
  let panel: Hole = PANEL_EMPTY;
  if (t >= T.chipClick && t < T.chipClose + 0.3) panel = t < T.chipClose ? mix(PANEL_EMPTY, PANEL_POP, T.chipClick, 0.2) : mix(PANEL_POP, PANEL_EMPTY, T.chipClose, 0.25);
  if (t >= T.summaryAt) panel = mix(PANEL_EMPTY, PANEL_FULL, T.summaryAt, 0.5);
  if (t >= T.collapseClick) panel = mix(PANEL_FULL, PANEL_HEAD, T.collapseClick, 0.3);
  const holes: Hole[] = [panel];
  // While the jump plays out, the player is lit as well.
  const pl = Math.min(ease.css(clamp((t - T.seekClick) / 0.3)), 1 - ease.css(clamp((t - 36.4) / 0.4)));
  holes.push(pl > 0 ? [PLAYER[0] + (1 - pl) * 498, PLAYER[1] + (1 - pl) * 280, PLAYER[2] * pl, PLAYER[3] * pl] : [0, 0, 0, 0]);
  return { holes, amount: on };
}
