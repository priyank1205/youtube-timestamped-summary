// Time is authored in seconds everywhere, so the whole film can be rendered at
// 30 or 60 fps from the same source. Easing curves mirror CSS cubic-bezier()
// exactly, because the extension's own motion is specified that way.
import { useCurrentFrame, useVideoConfig } from 'remotion';

export const useT = (): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const invLerp = (a: number, b: number, v: number) => (a === b ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a)));

export type Ease = (x: number) => number;

// A CSS cubic-bezier(x1, y1, x2, y2) timing function, solved for y at a given x.
export function bezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    if (Math.abs(sx(t) - x) > 1e-5) {
      t = x;
      for (let i = 0; i < 30; i++) {
        const v = sx(t);
        if (Math.abs(v - x) < 1e-6) break;
        if (v < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sy(t);
  };
}

export const ease = {
  linear: (x: number) => x,
  css: bezier(0.25, 0.1, 0.25, 1), // CSS `ease`
  in: bezier(0.42, 0, 1, 1),
  out: bezier(0, 0, 0.58, 1),
  inOut: bezier(0.42, 0, 0.58, 1),
  // House curves for the film's own motion graphics.
  outExpo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outCubic: (x: number) => 1 - Math.pow(1 - x, 3),
  inCubic: (x: number) => x * x * x,
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x: number) => 1 - Math.pow(1 - x, 4),
  inOutQuart: (x: number) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outBack: (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  // The extension's own curves, by name, as written in its CSS.
  quietIn: bezier(0.22, 1, 0.36, 1),
  material: bezier(0.4, 0, 0.2, 1),
  expand: bezier(0.2, 0, 0.2, 1),
  springy: bezier(0.34, 1.56, 0.64, 1),
  appIn: bezier(0.16, 1, 0.3, 1),
  // Smooth "camera" curve: slow-in, slow-out, with a long settle.
  camera: bezier(0.65, 0, 0.2, 1),
};

// Progress of a transition that starts at `start` and lasts `dur` seconds.
export const prog = (t: number, start: number, dur: number, e: Ease = ease.linear) =>
  e(clamp((t - start) / Math.max(1e-6, dur)));

// Value of a transition from a to b.
export const tween = (t: number, start: number, dur: number, a: number, b: number, e: Ease = ease.inOutCubic) =>
  lerp(a, b, prog(t, start, dur, e));

// A damped spring evaluated in closed form (no frame integration), so it is
// correct at any time without history: stiffness/damping/mass like CSS libs.
export function springAt(t: number, { stiffness = 170, damping = 26, mass = 1 } = {}): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
  const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
  const c2 = r1 / (r1 - r2);
  const c1 = 1 - c2;
  return 1 - (c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
}

// Piecewise keyframes: [[time, value], ...] with an easing per segment.
export function keys(t: number, frames: Array<[number, number, Ease?]>): number {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, e] = frames[i];
    const [t0, v0] = frames[i - 1];
    if (t <= t1) return lerp(v0, v1, (e || ease.inOutCubic)(clamp((t - t0) / Math.max(1e-6, t1 - t0))));
  }
  return frames[frames.length - 1][1];
}

// Deterministic pseudo-random in [0,1) from an integer seed.
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
