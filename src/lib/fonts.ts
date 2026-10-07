// Web fonts the films depend on. Roboto is what YouTube (and so the panel,
// which inherits YouTube's type) renders in; Inter Tight carries the first
// film's titles, Instrument Serif the second's. The files live in public/fonts (Google Fonts' variable latin
// builds, fetched once — see src/data/fonts.json), so a render never depends on
// the network. Remotion waits for each face before rendering a frame.
import { cancelRender, continueRender, delayRender, staticFile } from 'remotion';
import FONTS from '../data/fonts.json';

function load(key: keyof typeof FONTS) {
  const f = FONTS[key] as { family: string; range: string; files: Record<string, string>; style?: string };
  const file = Object.values(f.files)[0];
  if (typeof document !== 'undefined' && typeof FontFace !== 'undefined') {
    // Variable families cover every weight; the static serif is 400 only.
    const weight = f.style ? '400' : '100 900';
    const face = new FontFace(f.family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, { weight, style: f.style || 'normal', unicodeRange: f.range });
    const handle = delayRender(`font ${f.family}`);
    face.load().then((loaded) => { document.fonts.add(loaded); continueRender(handle); }).catch((e) => cancelRender(e));
  }
  return f.family;
}

export const roboto = load('Roboto');
export const interTight = load('InterTight');
export const inter = load('Inter');
export const serif = load('InstrumentSerif');
load('InstrumentSerifItalic');

export const YT_FONT = `${roboto}, Arial, sans-serif`;
