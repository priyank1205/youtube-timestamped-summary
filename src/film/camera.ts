// A virtual camera over "window space" (the browser window's own CSS pixels).
// (x, y) is the window point at the centre of the frame; z is screen pixels per
// window pixel. Zoom is interpolated in log space, so a 1×→4× move feels even.
import { clamp, ease, Ease, lerp } from '../lib/time';

export type Cam = { x: number; y: number; z: number; rx?: number; ry?: number };
export type Move = { at: number; dur: number; x?: number; y?: number; z?: number; rx?: number; ry?: number; e?: Ease };

export const W = 1920, H = 1080;

// Build a camera path from a start and a list of moves (each arriving at `at`).
export function path(start: Cam, moves: Move[]) {
  const keys: Array<{ t0: number; t1: number; from: Cam; to: Cam; e: Ease }> = [];
  let cur = { ...start };
  for (const m of [...moves].sort((a, b) => a.at - b.at)) {
    const to = { x: m.x ?? cur.x, y: m.y ?? cur.y, z: m.z ?? cur.z, rx: m.rx ?? 0, ry: m.ry ?? 0 };
    keys.push({ t0: m.at - m.dur, t1: m.at, from: cur, to, e: m.e || ease.camera });
    cur = to;
  }
  return (t: number): Cam => {
    let c = start;
    for (const k of keys) {
      if (t >= k.t1) { c = k.to; continue; }
      if (t > k.t0) {
        const p = k.e(clamp((t - k.t0) / (k.t1 - k.t0)));
        // Start from wherever the previous move had got to (moves may overlap).
        const from = c;
        return {
          x: lerp(from.x, k.to.x, p),
          y: lerp(from.y, k.to.y, p),
          z: Math.exp(lerp(Math.log(from.z), Math.log(k.to.z), p)),
          rx: lerp(from.rx ?? 0, k.to.rx ?? 0, p),
          ry: lerp(from.ry ?? 0, k.to.ry ?? 0, p),
        };
      }
      break;
    }
    return c;
  };
}

// Frame a window-space rectangle so it fills `fill` of the frame's limiting side.
export function frame(r: [number, number, number, number], fill = 0.8, maxZ = 4): Cam {
  const [x, y, w, h] = r;
  const z = Math.min(maxZ, (W * fill) / w, (H * fill) / h);
  return { x: x + w / 2, y: y + h / 2, z };
}

// The 3D part is emitted only while the camera is actually tilted: a flat
// transform keeps text rasterised at full resolution at any zoom.
export const transformFor = (c: Cam) => {
  const tilted = Math.abs(c.rx ?? 0) > 0.01 || Math.abs(c.ry ?? 0) > 0.01;
  const tilt = tilted ? ` perspective(2600px) rotateX(${(c.rx ?? 0).toFixed(3)}deg) rotateY(${(c.ry ?? 0).toFixed(3)}deg)` : '';
  return `translate(${W / 2}px, ${H / 2}px)${tilt} scale(${c.z}) translate(${-c.x}px, ${-c.y}px)`;
};

// Window-space point → screen point under a camera.
export const toScreen = (c: Cam, px: number, py: number) => ({ x: (px - c.x) * c.z + W / 2, y: (py - c.y) * c.z + H / 2 });
