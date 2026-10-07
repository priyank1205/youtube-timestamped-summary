import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const comp = await selectComposition({ serveUrl, id: 'WaapiTest' });
const logs = [];
await renderStill({ serveUrl, composition: comp, output: '.cache/bl.png', frame: 0, onBrowserLog: (l) => logs.push(l.text) });
console.log('logs:', logs.slice(0, 5));
