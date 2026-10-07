// Every sound cue in the second film, on the shared clock, for its soundtrack
// builder (audio/compose2.py). Same moments as the first film where the screen
// action is the same; paper, wood and pen where the first film had whooshes.
// Run: npx tsx src/film2/events.ts
import fs from 'node:fs';
import { T, DURATION } from '../film/T';
import { KEY_TIMES, SCRUB_KEYS, scrubFrac } from '../film/youtube';
import { CHAPTER_STARTS, VIDEO } from '../data/video';
import { PEN, COLUMN } from './script';

type Ev = { t: number; kind: string; v?: number; d?: number; n?: number };
const ev: Ev[] = [];
const add = (t: number, kind: string, extra: Partial<Ev> = {}) => ev.push({ t: +t.toFixed(4), kind, ...extra });

// Act 1 — typing, enter, the page filling the sheet, the scrub.
KEY_TIMES.forEach((k, i) => add(k, 'key', { v: 0.6 + ((i * 37) % 10) / 40 }));
add(T.enter, 'enter');
add(2.45, 'slide', { v: 0.5, d: 0.9 });
add(4.25, 'slide', { v: 0.3, d: 0.6 });
add(6.2, 'click');
add(SCRUB_KEYS[SCRUB_KEYS.length - 1][0] + 0.05, 'release');
const marks = CHAPTER_STARTS.filter((c) => c > 0).map((c) => c / VIDEO.duration);
{
  const t0 = SCRUB_KEYS[0][0], t1 = SCRUB_KEYS[SCRUB_KEYS.length - 1][0], dt = 1 / 960;
  let prev = scrubFrac(t0);
  for (let t = t0 + dt; t <= t1; t += dt) {
    const f = scrubFrac(t);
    marks.forEach((m, i) => { if ((prev - m) * (f - m) < 0) add(t, 'detent', { n: i, d: +m.toFixed(3), v: +Math.min(1, Math.abs(f - prev) / dt / 1.6).toFixed(3) }); });
    prev = f;
  }
}
add(10.0, 'slide', { v: 0.45, d: 0.8 });

// Act 2 — the stamp.
add(T.drop, 'stamp', { v: 1 });
add(T.tagline + 0.75, 'scribble', { d: 0.5, v: 0.6 });

// Act 3 — the demo.
add(T.demoIn + 0.2, 'slide', { v: 0.55, d: 0.9 });
add(T.chipClick, 'click'); add(T.chipClick + 0.02, 'tick', { v: 0.7 });
add(T.briefClick, 'click'); add(T.briefClick + 0.02, 'tick', { v: 0.5, n: -1 });
add(T.indepthClick, 'click'); add(T.indepthClick + 0.02, 'tick', { v: 0.6, n: 1 });
add(T.chipClose, 'click');
add(T.genClick, 'click');
add(T.genClick + 0.1, 'working', { d: T.summaryAt - T.genClick - 0.1 });
add(T.summaryAt, 'bloom', { v: 1 });
add(T.scrollStart, 'slide', { v: 0.2, d: T.scrollEnd - T.scrollStart });
add(T.seekClick, 'click');
add(T.seekLand, 'land');
add(T.expandClick, 'click'); add(T.expandClick + 0.03, 'tick', { v: 0.5, n: 1 });
add(T.capFound, 'chime', { v: 0.8 });
add(T.collapseClick, 'click'); add(T.collapseClick + 0.03, 'tick', { v: 0.45, n: -1 });

// Act 4 — popup and settings; the frame crosses the page.
add(46.1, 'slide', { v: 0.5, d: 0.9 });
add(T.iconClick, 'click'); add(T.iconClick + 0.02, 'tick', { v: 0.6 });
add(T.openSettings, 'click');
add(T.lightClick, 'click'); add(T.lightClick + 0.02, 'tick', { v: 0.6, n: 1 });
add(T.darkClick, 'click'); add(T.darkClick + 0.02, 'tick', { v: 0.6, n: -1 });
add(T.aiClick, 'click');
add(T.usageClick, 'click'); add(T.usageClick + 0.2, 'bloom', { v: 0.5 });

// Act 5 — the small print: the frame leaves, three lines set in turn.
add(60.0, 'slide', { v: 0.55, d: 0.8 });
[T.trust1, T.trust2, T.trust3].forEach((t, i) => add(t, 'chime', { v: 0.45, n: i }));

// Act 6 — install.
add(T.step1 - 0.1, 'slide', { v: 0.55, d: 0.9 });
add(T.scrollGH, 'slide', { v: 0.18, d: 1.55 });
add(T.zipClick, 'click'); add(T.zipClick + 0.9, 'chime', { v: 0.5, n: 4 });
add(T.openZip, 'click'); add(T.openZip + 0.1, 'unzip');
const q = 'chrome://extensions';
for (let i = 0; i < q.length; i++) add(T.typeExt + (i / q.length) * (T.extEnter - 0.15 - T.typeExt), 'key', { v: 0.55 + ((i * 53) % 10) / 36 });
add(T.extEnter, 'enter');
add(T.devClick, 'click'); add(T.devClick + 0.02, 'tick', { v: 0.6, n: 1 });
add(T.loadClick, 'click');
add(T.pickerIn, 'sheet');
add(T.pickClick, 'click');
add(T.selectClick, 'click');
add(T.cardIn, 'success');
add(T.freeClick, 'click');
add(T.pasteKey - 0.12, 'click');
add(T.pasteKey, 'paste');
add(T.connectClick, 'click');
add(T.connectClick + 0.1, 'working', { d: T.allSet - T.connectClick - 0.1 });
add(T.allSet, 'celebrate');
add(T.tryClick, 'click');

// Act 7 — back to the video, then the end page.
add(T.outroIn - 0.2, 'slide', { v: 0.55, d: 1.0 });
add(T.endCard - 0.3, 'slide', { v: 0.4, d: 0.8 });
add(T.endCard + 0.1, 'stamp', { v: 0.85 });
add(T.endCard + 1.5, 'scribble', { d: 0.5, v: 0.55 });

// The red pen and the paper tabs.
for (const m of PEN) {
  if (m.kind === 'note') { if (m.tab) add(m.at - 0.1, 'tab'); add(m.at, 'scribble', { d: m.dur ?? 0.7, v: 0.45 }); }
  else add(m.at, 'scribble', { d: m.dur ?? (m.kind === 'arrow' ? 0.55 : 0.5), v: m.kind === 'circle' ? 0.6 : 0.5 });
}
// The strike-through under "Answered in under a minute."
for (const c of COLUMN) if (c.strike) add(c.at + 1.0, 'scribble', { d: 0.45, v: 0.6 });

ev.sort((a, b) => a.t - b.t);
fs.writeFileSync('audio/events2.json', JSON.stringify({ duration: DURATION, T, events: ev }, null, 1));
console.log(`wrote audio/events2.json — ${ev.length} cues`);
