// Every sound cue in the film, derived from the same clock as the picture, and
// written to audio/events.json for the soundtrack builder (audio/compose.py).
// Run: npx tsx src/film/events.ts
import fs from 'node:fs';
import { T, BPM, DURATION } from './T';
import { KEY_TIMES, SCRUB_KEYS, scrubFrac } from './youtube';
import { CHAPTER_STARTS, VIDEO } from '../data/video';

type Ev = { t: number; kind: string; v?: number; d?: number; n?: number };
const ev: Ev[] = [];
const add = (t: number, kind: string, extra: Partial<Ev> = {}) => ev.push({ t: +t.toFixed(4), kind, ...extra });

// Act 1 — typing, enter, the page arriving, the zooms, scrubbing.
KEY_TIMES.forEach((k, i) => add(k, 'key', { v: 0.7 + ((i * 37) % 10) / 33 }));
add(T.enter, 'enter');
add(T.pullBack, 'whoosh', { v: 0.55, d: 1.0 });
add(4.25, 'whoosh', { v: 0.4, d: 0.6 });
add(T.capSomewhere + 0.15, 'tick', { v: 0.5 });
add(5.3, 'whoosh', { v: 0.45, d: 0.9 });
add(6.2, 'click');
add(SCRUB_KEYS[SCRUB_KEYS.length - 1][0] + 0.05, 'release');
// Scrubbing: a soft detent each time the dragged playhead crosses a chapter
// marker — n is the marker's index (its pitch), d its position on the bar (pan),
// v the drag's speed there.
const marks = CHAPTER_STARTS.filter((c) => c > 0).map((c) => c / VIDEO.duration);
{
  const t0 = SCRUB_KEYS[0][0], t1 = SCRUB_KEYS[SCRUB_KEYS.length - 1][0], dt = 1 / 960;
  let prev = scrubFrac(t0);
  for (let t = t0 + dt; t <= t1; t += dt) {
    const f = scrubFrac(t);
    marks.forEach((m, i) => {
      if ((prev - m) * (f - m) < 0) add(t, 'detent', { n: i, d: +m.toFixed(3), v: +Math.min(1, Math.abs(f - prev) / dt / 1.6).toFixed(3) });
    });
    prev = f;
  }
}
add(T.question, 'swell', { d: 3.5 });

// Act 2 — the drop and the reveal.
add(T.drop, 'impact', { v: 1 });
[0, 1, 2].forEach((i) => add(T.drop + 0.14 + i * 0.08, 'draw', { n: i }));
add(T.wordmark + 0.1, 'whoosh', { v: 0.45, d: 0.7 });
add(T.tagline, 'shimmer', { v: 0.55 });
add(T.revealOut, 'whoosh', { v: 0.6, d: 0.9 });

// Act 3 — the demo.
add(19.0, 'whoosh', { v: 0.35, d: 1.2 });
add(T.chipClick, 'click'); add(T.chipClick + 0.02, 'pop', { v: 0.8 });
add(T.briefClick, 'click'); add(T.briefClick + 0.02, 'comb', { v: -1 });
add(T.indepthClick, 'click'); add(T.indepthClick + 0.02, 'comb', { v: 1 });
add(T.chipClose, 'click'); add(T.chipClose + 0.02, 'pop', { v: 0.5, n: -1 });
add(T.genClick, 'click');
add(T.genClick + 0.1, 'working', { d: T.summaryAt - T.genClick - 0.1 });
add(T.summaryAt, 'shimmer', { v: 1 });
for (let i = 0; i < 14; i++) add(T.summaryAt + Math.min(i * 0.035, 0.49), 'row', { n: i });
add(T.scrollStart, 'scroll', { d: T.scrollEnd - T.scrollStart });
add(T.seekClick, 'click');
add(T.seekClick + 0.03, 'zip', { v: 1 });
add(T.seekLand, 'land');
add(T.expandClick, 'click'); add(T.expandClick + 0.03, 'expand');
add(T.capFound, 'ding', { v: 0.8 });
add(T.collapseClick, 'click'); add(T.collapseClick + 0.03, 'fold');
add(45.0, 'whoosh', { v: 0.35, d: 1.4 });

// Act 4 — popup and settings.
add(T.iconClick, 'click'); add(T.iconClick + 0.02, 'pop', { v: 0.7 });
add(T.openSettings, 'click'); add(T.openSettings + 0.12, 'whoosh', { v: 0.5, d: 0.7 });
add(T.lightClick, 'click'); add(T.lightClick + 0.02, 'toggle', { v: 1 });
add(T.darkClick, 'click'); add(T.darkClick + 0.02, 'toggle', { v: -1 });
add(T.aiClick, 'click'); add(T.aiClick + 0.05, 'whoosh', { v: 0.3, d: 0.5 });
add(T.usageClick, 'click'); add(T.usageClick + 0.05, 'whoosh', { v: 0.3, d: 0.5 });
add(T.usageClick + 0.2, 'bloom', { d: 1.4 });

// Act 5 — trust.
add(T.trustIn, 'whoosh', { v: 0.5, d: 1.0 });
[T.trust1, T.trust2, T.trust3].forEach((t, i) => add(t, 'bell', { n: i }));

// Act 6 — install.
add(T.installIn - 0.2, 'whoosh', { v: 0.55, d: 0.9 });
add(T.step1, 'whoosh', { v: 0.45, d: 0.8 });
add(T.scrollGH, 'scroll', { d: 1.55 });
add(T.zipClick, 'click'); add(T.zipClick + 0.9, 'done');
add(T.openZip, 'click'); add(T.openZip + 0.1, 'unzip');
const q = 'chrome://extensions';
for (let i = 0; i < q.length; i++) add(T.typeExt + (i / q.length) * (T.extEnter - 0.15 - T.typeExt), 'key', { v: 0.6 + ((i * 53) % 10) / 30 });
add(T.extEnter, 'enter');
add(T.devClick, 'click'); add(T.devClick + 0.02, 'toggle', { v: 1 });
add(T.loadClick, 'click');
add(T.pickerIn, 'sheet');
add(T.pickClick, 'click'); add(T.pickClick + 0.02, 'tick', { v: 0.35 });
add(T.selectClick, 'click');
add(T.cardIn, 'success');
add(T.setupIn, 'whoosh', { v: 0.45, d: 0.7 });
add(T.freeClick, 'click');
add(T.pasteKey - 0.12, 'click');
add(T.pasteKey, 'paste');
add(T.connectClick, 'click');
add(T.connectClick + 0.1, 'working', { d: T.allSet - T.connectClick - 0.1 });
add(T.allSet, 'celebrate');
add(T.tryClick, 'click');
add(T.outroIn - 0.3, 'whoosh', { v: 0.6, d: 1.0 });

// Act 7 — closing line and the end card.
add(T.endCard - 0.6, 'whoosh', { v: 0.6, d: 0.9 });
add(T.endCard, 'impact', { v: 0.85 });
[0, 1, 2].forEach((i) => add(T.endCard + 0.12 + i * 0.08, 'draw', { n: i }));
add(T.endCard + 2.25, 'shimmer', { v: 0.4 }); // light sweeping the icon

ev.sort((a, b) => a.t - b.t);
fs.mkdirSync('audio', { recursive: true });
fs.writeFileSync('audio/events.json', JSON.stringify({ bpm: BPM, duration: DURATION, T, events: ev }, null, 1));
console.log(`wrote audio/events.json — ${ev.length} cues`);
