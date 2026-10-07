// Renders the Measure composition frame by frame and collects the layout of
// every [data-m] element into src/data/layout.json.
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const comp = await selectComposition({ serveUrl, id: 'Measure' });
const layout = {};
for (let f = 0; f < comp.durationInFrames; f++) {
  await renderStill({ serveUrl, composition: comp, output: path.resolve('.cache', `measure-${f}.png`), frame: f,
    onBrowserLog: (l) => { if (l.text.startsWith('MEASURE ')) { const d = JSON.parse(l.text.slice(8)); layout[d.name] = d.rects; } } });
}
// Snapshot geometry captured from the real pages, re-based to window space later.
for (const f of fs.readdirSync('public/snapshots')) {
  const d = JSON.parse(fs.readFileSync(path.join('public/snapshots', f), 'utf8'));
  layout['snap:' + f.replace('.json', '')] = Object.fromEntries(Object.entries(d.geo).map(([k, r]) => [k, [r.x, r.y, r.w, r.h]]));
}
fs.writeFileSync('src/data/layout.json', JSON.stringify(layout, null, 1));
console.log('probes:', Object.keys(layout).join(', '));
