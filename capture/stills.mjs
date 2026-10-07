// Render a set of stills of the film at given times (seconds), for review.
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const times = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const comp = await selectComposition({ serveUrl, id: process.env.COMP || 'PromoDraft' });
fs.mkdirSync('.cache/stills', { recursive: true });
for (const s of times) {
  const frame = Math.round(s * comp.fps);
  const out = path.resolve('.cache/stills', `t${s.toFixed(2).padStart(6, '0')}.jpg`);
  await renderStill({ serveUrl, composition: comp, output: out, frame, imageFormat: 'jpeg', jpegQuality: 88,
    onBrowserLog: (l) => { if (l.type === 'error') console.log('browser error:', l.text.slice(0, 300)); } });
  console.log('wrote', out);
}
