// The film's clock. Everything — picture, captions and the soundtrack — keys off
// these times (seconds). The music runs at 120 BPM: a beat is 0.5 s and a bar
// is 2 s, and the big moments land on bar lines.
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const DURATION = 100;

export const T = {
  // ── ACT 1 · HOOK ────────────────────────────────────────────────────────────
  fadeIn: 0.0,
  typeStart: 0.5,
  typeEnd: 2.3,
  enter: 2.55,
  pageIn: 2.7,          // YouTube's red loading bar, then the watch page
  pullBack: 2.85,       // camera leaves the search box
  capAnswer: 3.35,      // "The answer’s in here."
  durZoom: 4.5,         // camera lands on 0:00 / 2:47:13
  capSomewhere: 4.85,   // "Somewhere in 2 h 47 min."
  scrubIn: 6.0,
  scrubOut: 10.0,
  question: 10.45,      // "What if you could read it first?"
  drop: 14.0,
  // ── ACT 2 · REVEAL ──────────────────────────────────────────────────────────
  revealIn: 13.75,
  wordmark: 14.35,
  tagline: 15.2,
  revealOut: 17.45,
  // ── ACT 3 · DEMO ────────────────────────────────────────────────────────────
  demoIn: 17.6,
  capSidebar: 18.6,
  chipClick: 20.5,
  capDepth: 20.8,
  briefClick: 21.75,
  indepthClick: 22.75,
  chipClose: 23.75,
  genClick: 24.75,
  capOneClick: 24.95,
  summaryAt: 27.35,
  capOverview: 27.75,
  scrollStart: 29.85,
  scrollEnd: 31.25,
  rowHover: 31.75,
  capThere: 31.85,
  seekClick: 32.75,
  seekLand: 33.0,       // the player has jumped
  capJump: 33.35,
  expandClick: 37.25,
  capDetail: 37.55,
  capFound: 39.6,
  collapseClick: 43.25,
  capFold: 43.5,
  demoOut: 46.0,
  // ── ACT 4 · MAKE IT YOURS ───────────────────────────────────────────────────
  iconClick: 46.75,
  openSettings: 47.85,
  settingsIn: 48.05,
  capYours: 48.55,
  lightClick: 50.0,
  capLive: 50.35,
  darkClick: 51.5,
  aiClick: 52.5,
  capAI: 52.8,
  usageClick: 55.75,
  capUsage: 56.05,
  settingsOut: 59.6,
  // ── ACT 5 · TRUST ───────────────────────────────────────────────────────────
  trustIn: 60.0,
  trust1: 60.25,
  trust2: 62.0,
  trust3: 63.75,
  trustOut: 65.7,
  // ── ACT 6 · INSTALL ─────────────────────────────────────────────────────────
  installIn: 66.0,
  step1: 67.4,
  scrollGH: 67.9,
  zipClick: 69.75,
  openZip: 71.05,       // opening the zip from the download bubble unzips it
  step2: 71.5,
  typeExt: 71.8,
  extEnter: 72.75,
  devClick: 73.8,
  loadClick: 74.95,
  pickerIn: 75.07,      // macOS's folder picker, opened on Downloads
  pickClick: 76.25,     // the unzipped folder
  selectClick: 77.55,
  cardIn: 77.95,
  step3: 79.2,
  setupIn: 79.45,
  freeClick: 80.65,
  pasteKey: 81.65,
  connectClick: 82.4,
  allSet: 83.0,
  tryClick: 86.0,
  installOut: 87.6,
  // ── ACT 7 · OUTRO ───────────────────────────────────────────────────────────
  outroIn: 88.0,
  capClosing: 88.6,
  endCard: 92.0,
  end: DURATION,
};
