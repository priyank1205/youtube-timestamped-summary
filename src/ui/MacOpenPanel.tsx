// macOS 26's folder picker (NSOpenPanel), as Chrome shows it for "Load unpacked":
// a sheet with the sidebar, a column browser and Cancel / Select. Rebuilt from
// 2× captures of the real panel on macOS 26.6 (capture/macos/panelcap3.swift),
// with Finder's own icons and SF Symbols (capture/macos/icons.swift), so it
// stays sharp under the film's camera. Units are points (CSS px).
import React from 'react';
import { staticFile } from 'remotion';
import SYM from '../data/macos-symbols.json';

export type MacTheme = 'dark' | 'light';

const PAL = {
  dark: {
    bg: 'rgb(30,34,35)', gutter: 'rgb(28,32,33)', border: 'rgb(73,77,77)', edge: 'rgba(0,0,0,0.85)',
    sideFill: 'rgb(29,31,31)', sideBorder: 'rgb(56,61,63)', sideBorderR: 'rgb(48,56,58)',
    sideSel: 'rgb(43,45,45)', accentText: 'rgb(0,138,255)',
    text: 'rgb(221,221,221)', sideText: 'rgb(242,244,245)', secondary: 'rgb(154,155,156)', chevron: 'rgb(152,154,154)',
    control: 'rgb(48,50,51)', controlText: 'rgb(223,224,224)', disabledGlyph: 'rgb(99,101,101)',
    sep: 'rgb(52,56,57)', headerSep: 'rgb(64,68,69)', track: 'rgb(42,44,45)', knob: 'rgb(159,160,160)', sideKnob: 'rgb(124,124,124)',
    selActive: 'rgb(0,89,209)', selInactive: 'rgb(70,70,70)', disabledText: 'rgba(255,255,255,0.26)',
    accent: 'rgb(19,126,255)', accentPressed: 'rgb(12,98,214)', searchBorder: 'rgba(255,255,255,0.09)', grip: 'rgb(110,112,113)',
  },
  light: {
    bg: 'rgb(255,255,255)', gutter: 'rgb(246,246,246)', border: 'rgb(140,140,140)', edge: 'rgba(0,0,0,0.25)',
    sideFill: 'rgb(249,249,249)', sideBorder: 'rgb(254,254,254)', sideBorderR: 'rgb(234,234,234)',
    sideSel: 'rgb(239,239,239)', accentText: 'rgb(0,106,246)',
    text: 'rgb(39,39,39)', sideText: 'rgb(25,25,25)', secondary: 'rgb(128,128,128)', chevron: 'rgb(130,130,129)',
    control: 'rgb(236,236,236)', controlText: 'rgb(36,36,36)', disabledGlyph: 'rgb(174,174,174)',
    sep: 'rgb(230,230,230)', headerSep: 'rgb(221,221,221)', track: 'rgb(243,243,243)', knob: 'rgb(122,122,122)', sideKnob: 'rgb(128,128,128)',
    selActive: 'rgb(0,100,225)', selInactive: 'rgb(220,220,220)', disabledText: 'rgba(0,0,0,0.26)',
    accent: 'rgb(19,126,255)', accentPressed: 'rgb(12,98,214)', searchBorder: 'rgba(0,0,0,0.08)', grip: 'rgb(170,170,170)',
  },
};
type Pal = typeof PAL.dark;

export const MAC_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

// ── Artwork ───────────────────────────────────────────────────────────────────────
type SymName = keyof typeof SYM;
// An SF Symbol, tinted, centred on (cx, cy). `k` scales from its exported point size.
export const Sym: React.FC<{ name: SymName; cx: number; cy: number; color: string; k?: number; style?: React.CSSProperties }> = ({ name, cx, cy, color, k = 1, style }) => {
  const m = SYM[name];
  const w = m.w * k, h = m.h * k;
  const url = `url(${staticFile(`macos/sym-${name}.png`)})`;
  return <div style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, background: color, WebkitMaskImage: url, maskImage: url, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', ...style }} />;
};

export type FileIcon = 'folder' | 'downloads' | 'zip' | 'json' | 'text' | 'data' | 'library' | 'system' | 'users' | 'pdf' | 'heic' | 'jpeg' | 'png';
const FileImg: React.FC<{ icon: FileIcon; x: number; y: number; size: number; dim?: boolean }> = ({ icon, x, y, size, dim }) => (
  <img src={staticFile(`macos/icon-${icon === 'folder' && size <= 16 ? 'folder-64' : icon}.png`)} style={{ position: 'absolute', left: x, top: y, width: size, height: size, opacity: dim ? 0.5 : 1 }} />
);

// ── Spec ──────────────────────────────────────────────────────────────────────────
export type SideItem = { icon: SymName; label: string; selected?: boolean };
export type SideSection = { title?: string; items: SideItem[] };
export type BrowserRow = { icon: FileIcon; name: string; folder?: boolean; disabled?: boolean; sel?: 'active' | 'inactive' };
export type BrowserGroup = { title: string; rows: BrowserRow[] };
export type BrowserColumn = { groups: BrowserGroup[]; knob?: { top: number; h: number } | null; enter?: number };

export type OpenPanelSpec = {
  theme: MacTheme;
  width: number;
  height?: number;
  message?: string;
  sidebar: SideSection[];
  sidebarWidth?: number;
  sideKnob?: { top: number; h: number } | null;
  path: { icon: FileIcon; label: string };
  columns: BrowserColumn[];
  hScroll?: { x: number; w: number } | null;
  selectEnabled?: boolean;
  selectPressed?: number;  // 0..1
  cancelPressed?: number;
  backEnabled?: boolean;
};

// Geometry measured on the 880 × 448 pt reference.
const G = {
  side: { x: 8, y: 8, inset: 8, r: 18 },
  sideRow: { pitch: 32, firstCenter: 34.5, headerGap: 39.5, afterHeader: 24.5, iconCx: 36.75, textX: 54.5, selX: 18.5, selW: 97, selH: 27.5, selR: 9 },
  tb: { y: 48.5, h: 24, r: 8 },
  browserTop: 93,
  colW: 245,
  row: { h: 22, iconX: 17, textX: 37, selX: 10, selR: 6 },
  header: { first: 28, gapBefore: 19, h: 23 },
  bottomTrack: { h: 11, gap: 2.5 },
  btn: { h: 24, y: 404, r: 7 },
};

// Finder truncates long names in the middle, keeping the start and the extension.
let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(s: string, font: string) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx!.font = font;
  return measureCtx!.measureText(s).width;
}
export function fitMiddle(s: string, max: number, font = `13px ${MAC_FONT}`) {
  if (textWidth(s, font) <= max) return s;
  let lo = 2, hi = s.length - 1, best = s.slice(0, 1) + '…' + s.slice(-1);
  while (lo <= hi) {
    const k = (lo + hi) >> 1;
    const cand = s.slice(0, Math.ceil(k / 2)) + '…' + s.slice(s.length - Math.floor(k / 2));
    if (textWidth(cand, font) <= max) { best = cand; lo = k + 1; } else hi = k - 1;
  }
  return best;
}

// ── Pieces ────────────────────────────────────────────────────────────────────────
const Text: React.FC<{ x: number; cy: number; size?: number; weight?: number; color: string; children: React.ReactNode; w?: number; align?: 'left' | 'center'; track?: number; stroke?: number }> = ({ x, cy, size = 13, weight = 400, color, children, w, align = 'left', track = 0, stroke = 0 }) => (
  <div style={{ position: 'absolute', left: x, top: cy - size * 0.62, width: w, height: size * 1.25, lineHeight: `${size * 1.25}px`, fontSize: size, fontWeight: weight, color, letterSpacing: track, whiteSpace: 'nowrap', overflow: w ? 'hidden' : undefined, textOverflow: w ? 'ellipsis' : undefined, textAlign: align, fontFamily: MAC_FONT, WebkitTextStroke: stroke ? `${stroke}px ${color}` : undefined }}>{children}</div>
);

const Sidebar: React.FC<{ spec: OpenPanelSpec; p: Pal; H: number }> = ({ spec, p, H }) => {
  const w = spec.sidebarWidth ?? 135;
  const els: React.ReactNode[] = [];
  let cy = G.sideRow.firstCenter;
  spec.sidebar.forEach((sec, si) => {
    if (sec.title) {
      if (si > 0) cy += G.sideRow.headerGap - G.sideRow.pitch;
      els.push(<Text key={`h${si}`} x={24.25} cy={cy - 0.5} size={11} weight={600} color={p.secondary}>{sec.title}</Text>);
      cy += G.sideRow.afterHeader;
    }
    sec.items.forEach((it, ii) => {
      const color = it.selected ? p.accentText : p.sideText;
      if (it.selected) els.push(<div key={`s${si}${ii}`} style={{ position: 'absolute', left: G.sideRow.selX, top: cy - G.sideRow.selH / 2 + 0.25, width: w - 38, height: G.sideRow.selH, borderRadius: G.sideRow.selR, background: p.sideSel }} />);
      els.push(<Sym key={`i${si}${ii}`} name={it.icon} cx={G.sideRow.iconCx} cy={cy} color={color} k={1.1} />);
      els.push(<Text key={`t${si}${ii}`} x={G.sideRow.textX} cy={cy} color={color} stroke={0.3}>{it.label}</Text>);
      cy += G.sideRow.pitch;
    });
  });
  return (
    <>
      <div style={{ position: 'absolute', left: G.side.x, top: G.side.y, width: w, height: H - 16, borderRadius: G.side.r, background: p.sideFill, boxShadow: `inset 1px 1px 0 ${p.sideBorder}, inset -1px -1px 0 ${p.sideBorderR}` }} />
      <div style={{ position: 'absolute', left: G.side.x, top: G.side.y, width: w, height: H - 16, borderRadius: G.side.r, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -G.side.x, top: -G.side.y, width: w + G.side.x, height: H }}>{els}</div>
        {spec.sideKnob ? <div style={{ position: 'absolute', left: 121, top: spec.sideKnob.top - G.side.y, width: 11, height: spec.sideKnob.h, borderRadius: 5.5, background: p.sideKnob }} /> : null}
      </div>
    </>
  );
};

const Toolbar: React.FC<{ spec: OpenPanelSpec; p: Pal; W: number }> = ({ spec, p, W }) => {
  const { y, h, r } = G.tb;
  const cy = y + h / 2;
  const searchW = 196, searchX = W - 19 - searchW;
  const popupW = 229, popupX = (357.5 + searchX) / 2 - popupW / 2;
  const btn = (x: number, w: number): React.CSSProperties => ({ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, background: p.control });
  return (
    <>
      {spec.message ? <Text x={163} cy={20.25} color={p.text}>{spec.message}</Text> : null}
      <div style={btn(163, 47)} />
      <Sym name="chevron.left" cx={175.5} cy={cy} color={spec.backEnabled ? p.controlText : p.disabledGlyph} k={0.95} />
      <div style={{ position: 'absolute', left: 186.25, top: y + 5, width: 1, height: h - 10, background: p.disabledGlyph, opacity: 0.6 }} />
      <Sym name="chevron.right" cx={197.5} cy={cy} color={p.disabledGlyph} k={0.95} />
      <div style={btn(218, 67)} />
      <Sym name="rectangle.split.3x1" cx={240} cy={cy} color={p.controlText} />
      <Sym name="chevron.down.small" cx={271.5} cy={cy + 0.5} color={p.controlText} k={0.9} />
      <div style={btn(293, 64.5)} />
      <Sym name="square.grid.3x1.below.line.grid.1x2" cx={313.5} cy={cy} color={p.controlText} />
      <Sym name="chevron.down.small" cx={344} cy={cy + 0.5} color={p.controlText} k={0.9} />
      <div style={btn(popupX, popupW)} />
      <FileImg icon={spec.path.icon} x={popupX + 11.6} y={cy - 8} size={16} />
      <Text x={popupX + 30.5} cy={cy} color={p.controlText} size={13} w={popupW - 30.5 - 28}>{spec.path.label}</Text>
      <Sym name="chevron.up.chevron.down" cx={popupX + popupW - 14} cy={cy} color={p.controlText} k={0.85} />
      <div style={{ ...btn(searchX, searchW), background: 'transparent', boxShadow: `inset 0 0 0 1px ${p.searchBorder}`, height: 25, top: 47.75, borderRadius: 9 }} />
      <Sym name="magnifyingglass" cx={searchX + 14} cy={cy + 0.5} color={p.secondary} k={0.92} />
      <Text x={searchX + 25} cy={cy + 0.5} color={p.secondary}>Search</Text>
    </>
  );
};

const Column: React.FC<{ col: BrowserColumn; x: number; p: Pal; bottom: number; first: boolean }> = ({ col, x, p, bottom, first }) => {
  const W = G.colW;
  const els: React.ReactNode[] = [];
  let y = G.browserTop;
  col.groups.forEach((g, gi) => {
    // the first group's header sits on a rule; later headers follow the rows above
    const hc = gi === 0 ? G.browserTop + 14.5 : y + (gi === 1 ? 41 : 36);
    els.push(<Text key={`gh${gi}`} x={x + G.row.textX} cy={hc} size={11} weight={600} color={p.secondary}>{g.title}</Text>);
    if (gi === 0) els.push(<div key="hsep" style={{ position: 'absolute', left: x, top: G.browserTop + 27.5, width: W - 17, height: 1, background: p.headerSep }} />);
    y = gi === 0 ? G.browserTop + 34 : hc + 12;
    g.rows.forEach((r, ri) => {
      const cy = y + G.row.h / 2;
      const active = r.sel === 'active';
      if (r.sel) els.push(<div key={`sel${gi}${ri}`} style={{ position: 'absolute', left: x + G.row.selX, top: y - 0.5, width: W - 37.25, height: G.row.h - 0.5, borderRadius: G.row.selR, background: active ? p.selActive : p.selInactive }} />);
      els.push(<FileImg key={`ic${gi}${ri}`} icon={r.icon} x={x + G.row.iconX} y={cy - 8} size={16} dim={r.disabled} />);
      els.push(<Text key={`tx${gi}${ri}`} x={x + G.row.textX} cy={cy} color={active ? '#fff' : r.disabled ? p.disabledText : p.text}>{fitMiddle(r.name, 162)}</Text>);
      if (r.folder) els.push(<Sym key={`ch${gi}${ri}`} name="chevron.right.small" cx={x + 209.5} cy={cy} color={active ? '#fff' : p.chevron} k={0.72} />);
      y += G.row.h;
    });
  });
  // the column's own (legacy, always visible) scroller and its resize grip
  const trackX = x + W - 14;
  void first;
  return (
    <div style={{ opacity: col.enter ?? 1 }}>
      {els}
      <div style={{ position: 'absolute', left: trackX, top: G.browserTop, width: 11, height: bottom - G.browserTop, background: p.track }} />
      {col.knob ? <div style={{ position: 'absolute', left: trackX + 0.5, top: col.knob.top, width: 10, height: col.knob.h, borderRadius: 5, background: p.knob }} /> : null}
      <div style={{ position: 'absolute', left: trackX + 4, top: bottom - 9, width: 1, height: 5, background: p.grip }} />
      <div style={{ position: 'absolute', left: trackX + 6, top: bottom - 9, width: 1, height: 5, background: p.grip }} />
    </div>
  );
};

const Button: React.FC<{ x: number; w: number; label: string; p: Pal; kind: 'normal' | 'default'; enabled?: boolean; pressed?: number }> = ({ x, w, label, p, kind, enabled = true, pressed = 0 }) => {
  const isDefault = kind === 'default' && enabled;
  const bg = isDefault ? (pressed > 0 ? mix(p.accent, p.accentPressed, pressed) : p.accent) : p.control;
  return (
    <div style={{ position: 'absolute', left: x, top: G.btn.y, width: w, height: G.btn.h, borderRadius: G.btn.r, background: bg, filter: !isDefault && pressed > 0 ? `brightness(${1 - 0.15 * pressed})` : undefined }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: MAC_FONT, fontSize: 13, color: isDefault ? '#fff' : enabled ? p.controlText : p.disabledText, lineHeight: 1 }}>{label}</div>
    </div>
  );
};

function mix(a: string, b: string, k: number) {
  const pa = a.match(/\d+/g)!.map(Number), pb = b.match(/\d+/g)!.map(Number);
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}

// ── The panel ────────────────────────────────────────────────────────────────────
export const MacOpenPanel: React.FC<{ spec: OpenPanelSpec }> = ({ spec }) => {
  const p = PAL[spec.theme];
  const W = spec.width, H = spec.height ?? 448;
  const sideW = spec.sidebarWidth ?? 135;
  const browserX = G.side.x + sideW;
  const trackY = 369, bottomSep = 382.5;
  return (
    <div style={{ position: 'relative', width: W, height: H, borderRadius: 26, background: p.bg, overflow: 'hidden', fontFamily: MAC_FONT, boxShadow: `inset 0 0 0 1px ${p.border}` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: browserX, height: H, background: p.gutter }} />
      <Sidebar spec={spec} p={p} H={H} />
      <Toolbar spec={spec} p={p} W={W} />
      <div style={{ position: 'absolute', left: browserX, top: 92, width: W - browserX, height: 1, background: p.sep }} />
      <div style={{ position: 'absolute', left: browserX, top: G.browserTop, width: W - browserX - 1, height: trackY - G.browserTop, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -browserX, top: -G.browserTop, width: W, height: H }}>
          {spec.columns.map((c, i) => <Column key={i} col={c} x={browserX + i * G.colW} p={p} bottom={trackY} first={i === 0} />)}
        </div>
      </div>
      <div style={{ position: 'absolute', left: browserX, top: trackY, width: W - browserX - 1, height: G.bottomTrack.h, background: p.track }} />
      {spec.hScroll ? <div style={{ position: 'absolute', left: browserX + spec.hScroll.x, top: trackY + 1.5, width: spec.hScroll.w, height: 8, borderRadius: 4, background: p.knob }} /> : null}
      <div style={{ position: 'absolute', left: browserX, top: bottomSep, width: W - browserX, height: 1, background: p.sep }} />
      <Button x={162.75} w={93} label="New Folder" p={p} kind="normal" />
      <Button x={W - 20 - 74 - 8 - 74} w={74} label="Cancel" p={p} kind="normal" pressed={spec.cancelPressed} />
      <Button x={W - 20 - 74} w={74} label="Select" p={p} kind="default" enabled={spec.selectEnabled ?? true} pressed={spec.selectPressed} />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 26, boxShadow: `inset 0 0 0 1px ${p.border}`, pointerEvents: 'none' }} />
    </div>
  );
};
