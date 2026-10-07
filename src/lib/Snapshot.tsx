// Mounts a captured page (see capture/snapshot.mjs) inside a shadow root, so its
// own stylesheet applies untouched and nothing leaks into the film. The page's
// CSS animations are driven to the current time from `start`.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import { freezeCssAnimations, resetAnimations } from './anim';

export type SnapshotData = {
  viewport: { w: number; h: number };
  scroll: { x: number; y: number };
  docHeight: number;
  htmlClass: string;
  htmlAttrs: Array<[string, string]>;
  bodyClass: string;
  bodyStyle: string;
  html: string;
  css: string;
  geo: Record<string, { x: number; y: number; w: number; h: number }>;
};

const cache = new Map<string, Promise<SnapshotData>>();
const loaded = new Map<string, SnapshotData>();

export function loadSnapshot(name: string): Promise<SnapshotData> {
  if (!cache.has(name)) {
    cache.set(name, fetch(staticFile(`snapshots/${name}.json`)).then((r) => {
      if (!r.ok) throw new Error(`snapshot ${name}: ${r.status}`);
      return r.json();
    }).then((d: SnapshotData) => {
      // Asset paths in the capture are site-absolute; re-root them on the film's static dir.
      d.html = d.html.replace(/src="\/(?!\/)([^"]+)"/g, (_m, p) => `src="${staticFile(p)}"`);
      loaded.set(name, d);
      return d;
    }));
  }
  return cache.get(name)!;
}

// Every snapshot the film uses, fetched up front so no frame is ever captured
// while one is still loading.
export const ALL_SNAPSHOTS = [
  'popup', 'settings-summaries', 'settings-summaries-light', 'settings-summaries-dark-again', 'settings-ai',
  'settings-stats', 'setup-1', 'setup-2', 'setup-2-typed', 'setup-2-checking', 'setup-3',
];

export function usePreloadSnapshots(names: string[] = ALL_SNAPSHOTS) {
  const [handle] = useState(() => (names.every((n) => loaded.has(n)) ? null : delayRender('preload snapshots')));
  useEffect(() => {
    if (handle === null) return;
    Promise.all(names.map(loadSnapshot)).then(() => continueRender(handle)).catch((e) => cancelRender(e));
  }, [handle, names]);
}

// The snapshot for `name`, read synchronously, so a change of state on one frame
// can never render the previous state's page (the bug a stateful hook had).
export function useSnapshot(name: string): SnapshotData | null {
  const [, bump] = useState(0);
  useLayoutEffect(() => {
    if (loaded.has(name)) return;
    const h = delayRender(`snapshot ${name}`);
    loadSnapshot(name).then(() => { bump((x) => x + 1); continueRender(h); }).catch((e) => cancelRender(e));
  }, [name]);
  return loaded.get(name) || null;
}

const BASE = `
  :host { all: initial; display: block; position: relative; overflow: hidden; contain: paint; transform: translateZ(0); }
  .snap-html { display: block; width: 100%; min-height: 100%; position: relative; }
  .snap-body { display: block; margin: 0; min-height: 100%; position: relative; }
  *, *::before, *::after { transition: none !important; caret-color: transparent !important; }
`;

type Props = {
  name: string;
  t: number;
  start: number;
  width: number;
  height: number;
  scrollY?: number;
  extraCss?: string;
  onFrame?: (root: ShadowRoot, t: number) => void;
  style?: React.CSSProperties;
};

export const Snapshot: React.FC<Props> = ({ name, t, start, width, height, scrollY = 0, extraCss = '', onFrame, style }) => {
  const host = useRef<HTMLDivElement>(null);
  const shown = useRef<string | null>(null);
  const data = useSnapshot(name);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el || !data) return;
    const root = el.shadowRoot || el.attachShadow({ mode: 'open' });
    const key = name + '|' + extraCss;
    if (shown.current !== key) {
      const attrs = data.htmlAttrs.filter(([k]) => k !== 'class' && k !== 'style')
        .map(([k, v]) => ` ${k}="${v.replace(/"/g, '&quot;')}"`).join('');
      root.innerHTML = `<style>${data.css}\n${BASE}\n${extraCss}</style><style class="snap-freeze"></style>` +
        `<div class="snap-html ${data.htmlClass}"${attrs}><div class="snap-body ${data.bodyClass}" style="${data.bodyStyle.replace(/"/g, '&quot;')}">${data.html}</div></div>`;
      resetAnimations(root);
      shown.current = key;
    }
    const doc = root.querySelector('.snap-html') as HTMLElement | null;
    if (doc) doc.style.transform = scrollY ? `translateY(${-scrollY}px)` : '';
    if (onFrame) onFrame(root, t);
    freezeCssAnimations(root, root.querySelector('.snap-freeze') as HTMLStyleElement, t, start);
  });

  return <div ref={host} style={{ width, height, ...style }} />;
};
