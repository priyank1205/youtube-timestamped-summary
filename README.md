# Promo films

Explainer videos for Timestamped Summary for YouTube, made in code with
[Remotion](https://www.remotion.dev/). Nothing here ships with the extension; this
folder only produces video files.

There are three films on one clock (`src/film/T.ts`), so the same screen action can
be compared across styles:

- **Promo** (`src/film/`): dark, cinematic, kinetic type, a synth-pop score.
- **Promo2, "Daylight"** (`src/film2/`): the same story in light mode on warm paper,
  the browser framed beside editorial serif captions, marked up in red pen, with a
  jazz-waltz score.
- **Promo3, "Daylight" in dark** (`src/film2/`, `theme="dark"`): the same editorial
  film on a near-black sheet, with the product in dark mode and the same score.

## What's real and what's drawn

- **The panel** is rebuilt node for node from `scripts/ui-builder.js` and styled by
  the extension's own `styles/content.css` and `styles/skin-quiet.css`
  (`src/ui/Panel.tsx`), dark or light (`yt-theme-light`). Its transitions use the
  same durations and curves as the CSS.
- **Settings, the setup guide and the toolbar popup** are snapshots of the real
  `options/options.html` and `popup/popup.html`, captured with stubbed `chrome.*`
  APIs (`capture/capture-options.mjs`, `capture/capture-popup.mjs`) and replayed in a
  shadow root, with their own CSS animations driven frame by frame. These pages are
  dark-only, so they are dark in both films.
- **GitHub and `chrome://extensions`** are high-resolution captures of the real pages,
  in both themes (`capture/github-release.mjs`, `SCHEME=light` for the second film;
  `capture/extensions-reference.mjs`, `capture/extensions-day.mjs`). The version shown
  comes from the latest release (`src/data/github-release.json`).
- **macOS's folder picker** (Load unpacked) is rebuilt from 2× captures of the real
  NSOpenPanel on macOS 26 in both appearances, with Finder's own icons and SF Symbols
  (`src/ui/MacOpenPanel.tsx`; the capture tools are in `capture/macos/`, and
  `PickerTest` overlays the rebuild on a capture). It opens centred on the window, as
  sheets do on macOS 26.
- **YouTube** is drawn to geometry and colours measured from youtube.com at 1440×810
  in both themes (`capture/youtube-reference.mjs`, `capture/youtube-reference-light.mjs`),
  with YouTube's own icons. The channel, the lecture and the recommendations are
  fictional.
- **Chrome's frame** uses Chrome 152's own colours, dark and light
  (`capture/chrome-colors.mjs`).
- **The soundtracks** are synthesised from scratch (no samples): `audio/compose.py`
  for the first film, `audio/compose2.py` for the second, each locked to the picture
  through its cue list (`audio/events.json`, `audio/events2.json`).
- **Fonts** (Roboto, Inter, Inter Tight, Instrument Serif; OFL/Apache) live in
  `public/fonts`, so renders never need the network.

## Commands

```bash
npm install
npx remotion studio src/index.ts          # scrub the films in a browser
npx tsx src/film/events.ts                # re-export the first film's sound cues
npx tsx src/film2/events.ts               # … and the second's
.venv/bin/python audio/compose.py         # rebuild public/audio/soundtrack.wav
.venv/bin/python audio/compose2.py        # rebuild public/audio/soundtrack2.wav
npx remotion render src/index.ts Promo out/promo.mp4             # first film, 1080p60
npx remotion render src/index.ts Promo2 out/promo-daylight.mp4   # second film, 1080p60
npx remotion render src/index.ts Promo3 out/promo-daylight-dark.mp4   # … in dark mode
npx remotion still src/index.ts Poster out/poster.png
npx remotion still src/index.ts PosterDaylight out/daylight-dark-poster.png
bash scripts/export.sh                    # first film: README cut, landing-page versions, poster, GIF
bash scripts/export.sh out/promo-daylight-dark.mp4 out/daylight-dark-poster.png out/daylight-dark out/daylight-dark-loop.gif
```

The audio scripts need a Python venv: `python3 -m venv .venv && .venv/bin/pip install numpy scipy soundfile pedalboard pyloudnorm`.

Re-run the capture scripts (`node capture/<name>.mjs`) after changing the panel,
settings or setup guide, then `node capture/measure.mjs` so the pointer targets
follow the new layout. After a new release, re-run `capture/github-release.mjs` (both
schemes) and `capture/extensions-reference.mjs`, and copy `public/github/release.json`
to `src/data/github-release.json`.

## Where things are

| Path | What |
|---|---|
| `src/film/T.ts` | The shared clock: every beat, click and caption time |
| `src/film/script.ts` | First film: camera moves, pointer path, captions |
| `src/film/youtube.ts` | What the YouTube page and panel do over time |
| `src/film/settings.tsx`, `install.tsx`, `Cards.tsx`, `Reveal.tsx`, `EndCard.tsx` | The first film's other acts |
| `src/film/Poster.tsx` | The poster (README thumbnail, landing-page `poster`) |
| `src/film2/` | The Daylight films (light and dark): paper, frame, red pen, pages, poster, their own choreography |
| `src/ui/` | Panel, YouTube page, Chrome window, macOS folder picker, logo |
| `audio/compose.py`, `audio/compose2.py` | Music and sound design for each film |
