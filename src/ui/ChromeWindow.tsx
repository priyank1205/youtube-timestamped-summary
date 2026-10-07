// A Chrome window on macOS, in Chrome's 2023+ design. Colours are Chrome 152's
// own (read from chrome://theme/colors.css by capture/chrome-colors.mjs). Dark:
// frame #1f2020, active tab and toolbar #3c3c3c, location bar #282828, toolbar
// icons #c7c7c7, text #e3e3e3. Light (`theme="light"`): frame #d3e3fd, toolbar
// and active tab #ffffff, location bar #edf2fa, icons #474747, text #1f1f1f.
import React from 'react';
import { staticFile } from 'remotion';

export const CHROME = { tabStrip: 40, toolbar: 46, w: 1440, contentH: 810 };
export const CHROME_TOP = CHROME.tabStrip + CHROME.toolbar;
export const WINDOW_H = CHROME_TOP + CHROME.contentH;

const THEMES = {
  dark: {
    frame: '#1f2020', toolbar: '#3c3c3c', omnibox: '#282828', icon: '#c7c7c7', text: '#e3e3e3', dim: '#c7c7c7', divider: '#5c5c5c', tabDivider: '#5c5c5c',
    path: '#a5a5a5', chip: 'rgba(253,252,251,0.1)', chipSep: '#5e5e5e', disabled: '#7b7b7b', progress: '#a8c7fa', content: '#0f0f0f', github: '#e3e3e3', extFav: '#a8c7fa',
    shadow: '0 0 0 1px rgba(255,255,255,0.08), 0 40px 120px rgba(0,0,0,0.6), 0 12px 40px rgba(0,0,0,0.45)', hover: 'rgba(253,252,251,0.1)',
  },
  light: {
    frame: '#d3e3fd', toolbar: '#ffffff', omnibox: '#edf2fa', icon: '#474747', text: '#1f1f1f', dim: '#474747', divider: '#c7c7c7', tabDivider: '#a8c7fa',
    path: '#474747', chip: 'rgba(31,31,31,0.06)', chipSep: '#c7c7c7', disabled: '#b0b0b0', progress: '#0b57d0', content: '#ffffff', github: '#1f1f1f', extFav: '#0b57d0',
    shadow: '0 0 0 1px rgba(0,0,0,0.07), 0 36px 90px rgba(70,50,30,0.20), 0 10px 28px rgba(70,50,30,0.14)', hover: 'rgba(31,31,31,0.06)',
  },
};
export type ChromeTheme = keyof typeof THEMES;
type ChromeColors = typeof THEMES.dark;
const ColorsCtx = React.createContext<ChromeColors>(THEMES.dark);
const useC = () => React.useContext(ColorsCtx);
const UI_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif';

export type Tab = { id: string; title: string; favicon: 'youtube' | 'extension' | 'extensions' | 'github' | 'blank'; enter?: number };

const Favicon: React.FC<{ kind: Tab['favicon'] }> = ({ kind }) => {
  const COLORS = useC();
  if (kind === 'youtube') return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}><rect x="0.5" y="3" width="15" height="10.5" rx="3" fill="#ff0033" /><path d="M6.5 5.6v5.3l4.5-2.65z" fill="#fff" /></svg>
  );
  if (kind === 'extension') return <img src={staticFile('icons/icon48.png')} width={16} height={16} style={{ borderRadius: 3, flexShrink: 0 }} />;
  if (kind === 'extensions') return (
    <svg width="16" height="16" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M20.5 11H19V7a2 2 0 0 0-2-2h-4V3.5a2.5 2.5 0 0 0-5 0V5H4a2 2 0 0 0-2 2v3.8h1.5a2.7 2.7 0 0 1 0 5.4H2V20a2 2 0 0 0 2 2h3.8v-1.5a2.7 2.7 0 0 1 5.4 0V22H17a2 2 0 0 0 2-2v-4h1.5a2.5 2.5 0 0 0 0-5z" fill={COLORS.extFav} /></svg>
  );
  if (kind === 'github') return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}><path fill={COLORS.github} d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></svg>
  );
  return <span style={{ width: 16, height: 16 }} />;
};

const IconBtn: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; m?: string }> = ({ children, style, m }) => (
  <div data-m={m} style={{ width: 34, height: 34, borderRadius: 17, display: 'grid', placeItems: 'center', flexShrink: 0, ...style }}>{children}</div>
);

const useP = () => ({ fill: useC().icon });
const Back = () => { const P = useP(); return <svg width="20" height="20" viewBox="0 0 24 24"><path {...P} d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>; };
const Fwd = () => <svg width="20" height="20" viewBox="0 0 24 24"><path fill={useC().disabled} d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>;
const Reload = () => { const P = useP(); return <svg width="20" height="20" viewBox="0 0 24 24"><path {...P} d="M17.65 6.35A7.958 7.958 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A5.99 5.99 0 0 1 12 18a6 6 0 1 1 0-12c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" /></svg>; };
const Star = () => { const P = useP(); return <svg width="18" height="18" viewBox="0 0 24 24"><path {...P} d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z" /></svg>; };
const Puzzle = () => { const P = useP(); return <svg width="20" height="20" viewBox="0 0 24 24"><path {...P} d="M10.5 4.5c.28 0 .5.22.5.5v2h6v6h2c.28 0 .5.22.5.5s-.22.5-.5.5h-2v6h-2.12c-.68-1.75-2.39-3-4.38-3s-3.7 1.25-4.38 3H4v-2.12c1.75-.68 3-2.39 3-4.38 0-1.99-1.24-3.7-2.99-4.38L4 7h6V5c0-.28.22-.5.5-.5m0-2C9.12 2.5 8 3.62 8 5H4c-1.1 0-1.99.9-1.99 2v3.8h.29c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-.3c0-1.49 1.21-2.7 2.7-2.7s2.7 1.21 2.7 2.7v.3H17c1.1 0 2-.9 2-2v-4c1.38 0 2.5-1.12 2.5-2.5S20.38 11 19 11V7c0-1.1-.9-2-2-2h-4c0-1.38-1.12-2.5-2.5-2.5z" /></svg>; };
const Kebab = () => { const P = useP(); return <svg width="20" height="20" viewBox="0 0 24 24"><path {...P} d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>; };
const Tune = () => { const P = useP(); return <svg width="16" height="16" viewBox="0 0 24 24"><path {...P} d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" /></svg>; };
const Download: React.FC<{ progress: number }> = ({ progress }) => {
  const P = useP(), COLORS = useC();
  return (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path {...P} d="M12 15.6 7.4 11l1.4-1.4 2.2 2.2V4h2v7.8l2.2-2.2 1.4 1.4zM6 20q-.8 0-1.4-.6T4 18v-3h2v3h12v-3h2v3q0 .8-.6 1.4T18 20z" />
    {progress > 0 && progress < 1 ? <circle cx="12" cy="12" r="11" fill="none" stroke={COLORS.progress} strokeWidth="1.6" strokeDasharray={`${69 * progress} 69`} transform="rotate(-90 12 12)" /> : null}
  </svg>
  );
};

export type ChromeProps = {
  tabs: Tab[];
  active: string;
  t: number;
  url: { host: string; path: string; secureChip?: string; typed?: { text: string; caret: boolean } | null };
  showExtensionIcon?: boolean;
  extensionIconHighlight?: number;
  download?: { visible: number; progress: number } | null;
  children: React.ReactNode;
  overlay?: React.ReactNode;   // popups and bubbles anchored to the toolbar
  theme?: ChromeTheme;
};

export const ChromeWindow: React.FC<ChromeProps> = ({ theme = 'dark', ...rest }) => (
  <ColorsCtx.Provider value={THEMES[theme]}><ChromeFrame {...rest} /></ColorsCtx.Provider>
);

const ChromeFrame: React.FC<Omit<ChromeProps, 'theme'>> = ({ tabs, active, t, url, showExtensionIcon = true, extensionIconHighlight = 0, download, children, overlay }) => {
  const COLORS = useC();
  const tabW = 240;
  return (
    <div style={{ width: CHROME.w, height: WINDOW_H, borderRadius: 12, overflow: 'hidden', background: COLORS.frame, position: 'relative', fontFamily: UI_FONT, boxShadow: COLORS.shadow }} data-m="window">
      {/* Tab strip */}
      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: CHROME.tabStrip }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
          <div key={c} style={{ position: 'absolute', left: 14 + i * 20, top: 14, width: 12, height: 12, borderRadius: 6, background: c, boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.25)' }} />
        ))}
        <div style={{ position: 'absolute', left: 78, top: 8, width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24"><path fill={COLORS.icon} d="M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6z" /></svg>
        </div>
        {tabs.map((tab, i) => {
          const isActive = tab.id === active;
          const enter = tab.enter === undefined ? 1 : Math.min(1, Math.max(0, (t - tab.enter) / 0.22));
          const x = 108 + i * (tabW - 8);
          const w = tabW * (0.4 + 0.6 * enter);
          return (
            <div key={tab.id} style={{ position: 'absolute', left: x, top: 6, width: w, height: 34, opacity: enter }} data-m={`tab-${tab.id}`}>
              {isActive ? (
                <svg style={{ position: 'absolute', left: -10, top: 0 }} width={w + 20} height={34} viewBox={`0 0 ${w + 20} 34`}>
                  <path d={`M0 34 Q10 34 10 24 V10 Q10 0 20 0 H${w} Q${w + 10} 0 ${w + 10} 10 V24 Q${w + 10} 34 ${w + 20} 34 Z`} fill={COLORS.toolbar} />
                </svg>
              ) : i > 0 && tabs[i - 1].id !== active ? <div style={{ position: 'absolute', left: -1, top: 9, width: 1, height: 16, background: COLORS.tabDivider }} /> : null}
              <div style={{ position: 'absolute', left: 14, top: 9, display: 'flex', alignItems: 'center', gap: 9, width: w - 46, overflow: 'hidden' }}>
                <Favicon kind={tab.favicon} />
                <span style={{ fontSize: 12.5, color: isActive ? COLORS.text : COLORS.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.005em' }}>{tab.title}</span>
              </div>
              <svg style={{ position: 'absolute', right: 12, top: 11 }} width="12" height="12" viewBox="0 0 24 24"><path fill={isActive ? COLORS.text : COLORS.dim} d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 108 + tabs.length * (tabW - 8) + 6, top: 9, width: 24, height: 24, display: 'grid', placeItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill={COLORS.icon} d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
        </div>
      </div>
      {/* Toolbar */}
      <div style={{ position: 'absolute', left: 0, top: CHROME.tabStrip, right: 0, height: CHROME.toolbar, background: COLORS.toolbar, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 2, boxSizing: 'border-box' }}>
        <IconBtn><Back /></IconBtn>
        <IconBtn><Fwd /></IconBtn>
        <IconBtn><Reload /></IconBtn>
        <div style={{ flex: 1, height: 34, borderRadius: 17, background: COLORS.omnibox, margin: '0 6px 0 4px', display: 'flex', alignItems: 'center', padding: '0 6px', position: 'relative' }} data-m="omnibox">
          <div style={{ width: 26, height: 26, borderRadius: 13, display: 'grid', placeItems: 'center', background: COLORS.chip }}>
            {url.secureChip ? <Favicon kind="extension" /> : <Tune />}
          </div>
          {url.secureChip ? <span style={{ marginLeft: 8, fontSize: 14, color: COLORS.text, whiteSpace: 'nowrap' }}>{url.secureChip}</span> : null}
          {url.secureChip ? <span style={{ margin: '0 8px', width: 1, height: 16, background: COLORS.chipSep }} /> : null}
          <span style={{ marginLeft: url.secureChip ? 0 : 10, fontSize: 14, whiteSpace: 'pre', letterSpacing: '0.005em' }}>
            {url.typed ? (
              <span style={{ color: COLORS.text }}>{url.typed.text}{url.typed.caret ? <span style={{ display: 'inline-block', width: 1.5, height: 17, background: COLORS.text, verticalAlign: '-3px', marginLeft: 1 }} /> : null}</span>
            ) : (
              <>
                <span style={{ color: COLORS.text }}>{url.host}</span>
                <span style={{ color: COLORS.path }}>{url.path}</span>
              </>
            )}
          </span>
          <div style={{ flex: 1 }} />
          <div style={{ width: 28, height: 28, display: 'grid', placeItems: 'center' }}><Star /></div>
        </div>
        {download ? <IconBtn style={{ opacity: download.visible }} m="download"><Download progress={download.progress} /></IconBtn> : null}
        {showExtensionIcon ? (
          <IconBtn m="ext-icon" style={{ background: extensionIconHighlight ? COLORS.hover : undefined, opacity: 1 }}>
            <img src={staticFile('icons/icon48.png')} width={18} height={18} style={{ borderRadius: 4 }} />
          </IconBtn>
        ) : null}
        <IconBtn m="puzzle"><Puzzle /></IconBtn>
        <div style={{ width: 1, height: 20, background: COLORS.divider, margin: '0 4px' }} />
        <IconBtn><div style={{ width: 24, height: 24, borderRadius: 12, background: 'linear-gradient(135deg, #5b6cff, #c056d6)', color: '#fff', fontSize: 12, fontWeight: 600, display: 'grid', placeItems: 'center' }}>A</div></IconBtn>
        <IconBtn><Kebab /></IconBtn>
      </div>
      {/* Content */}
      <div style={{ position: 'absolute', left: 0, top: CHROME_TOP, width: CHROME.w, height: CHROME.contentH, overflow: 'hidden', background: COLORS.content, contain: 'paint' }} data-m="content">
        {children}
      </div>
      {overlay}
    </div>
  );
};
