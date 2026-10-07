import type React from 'react';
// Frame-accurate control of REAL CSS keyframe animations (the setup guide's
// confetti and rise-ins, pane fades…) inside captured pages.
//
// Remotion may hide and re-show the composition after effects have run, which
// restarts CSS animations and throws away anything set through the Web
// Animations API. So time is written declaratively instead: every animated
// element (and ::before/::after) is paused with a negative animation-delay equal
// to "seconds since its state began" minus its own authored delay. A re-created
// animation then lands on exactly the same frame.
//
// The start of an animation is read from the nearest ancestor carrying
// `data-anim-<name>` (one specific animation) or `data-anim-start` (everything
// inside it); otherwise `fallbackStart`.

function startFor(target: Element, name: string, fallback: number): number {
  const attr = `data-anim-${name.toLowerCase()}`;
  const own = target.closest(`[${attr}]`);
  let v = own ? parseFloat(own.getAttribute(attr) || '') : NaN;
  if (Number.isFinite(v)) return v;
  const holder = target.closest('[data-anim-start]');
  v = holder ? parseFloat(holder.getAttribute('data-anim-start') || '') : NaN;
  return Number.isFinite(v) ? v : fallback;
}

const secs = (s: string) => s.split(',').map((x) => {
  const v = x.trim();
  return v.endsWith('ms') ? parseFloat(v) / 1000 : parseFloat(v);
});

type Entry = { el: HTMLElement; pseudo: '' | '::before' | '::after'; names: string[]; delays: number[]; id: number };
const registry = new WeakMap<Node, Entry[]>();

function scan(root: ParentNode): Entry[] {
  const out: Entry[] = [];
  let id = 0;
  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    for (const pseudo of ['', '::before', '::after'] as const) {
      const cs = getComputedStyle(el, pseudo || null);
      const name = cs.animationName;
      if (!name || name === 'none') continue;
      if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
      out.push({ el, pseudo, names: name.split(',').map((n) => n.trim()), delays: secs(cs.animationDelay), id: id++ });
    }
  });
  return out;
}

// Freeze every CSS animation under `root` at time t. `styleHost` receives the
// generated rules for pseudo-elements (a <style> element inside the same tree).
export function freezeCssAnimations(root: ParentNode, styleHost: HTMLStyleElement, t: number, fallbackStart: number) {
  let entries = registry.get(root as unknown as Node);
  if (!entries) {
    entries = scan(root);
    registry.set(root as unknown as Node, entries);
  }
  const rules: string[] = [];
  for (const e of entries) {
    const delays = e.names.map((n, i) => {
      const d = e.delays[i] ?? e.delays[0] ?? 0;
      return `${(d - (t - startFor(e.el, n, fallbackStart))).toFixed(4)}s`;
    }).join(', ');
    if (!e.pseudo) {
      e.el.style.setProperty('animation-delay', delays, 'important');
      e.el.style.setProperty('animation-play-state', 'paused', 'important');
    } else {
      e.el.setAttribute('data-pf', String(e.id));
      rules.push(`[data-pf="${e.id}"]${e.pseudo}{animation-delay:${delays}!important;animation-play-state:paused!important}`);
    }
  }
  styleHost.textContent = rules.join('\n');
}

// Forget a root's scan (call when its content is replaced).
export function resetAnimations(root: ParentNode) {
  registry.delete(root as unknown as Node);
}

// For components that render their own animated elements: the inline style
// that pins one CSS animation (authored delay `delay`, started at `start`) to t.
export const pin = (t: number, start: number, delay = 0): React.CSSProperties => ({
  animationDelay: `${(delay - (t - start)).toFixed(4)}s`,
  animationPlayState: 'paused',
});
