# Changelog

Notable changes to the extension. Version numbers match `manifest.json`, and
every released version has an entry here and on the
[Releases page](https://github.com/priyank1205/yt-transcript-ext/releases).

Write new entries under **Unreleased** as you go; `npm run bump` moves that
section under the new version number when you release.

## Unreleased

### Changed

- **The Detail control shows you what you are choosing.** The slider is now a
  field of forty-two slots laid across the video's runtime, with one lit for
  every point that level returns: Brief lights a scattering, In-depth lights all
  of them. The reading sits top right the way a meter's does — *36 POINTS* — and
  the video's own clock runs under the field, so the picture is legible as a
  sampling rate rather than a volume slider. Drag across it, click a level, or
  use the arrow keys, as before.
- **Opening it no longer buries the panel.** The module hangs off the header's
  bottom edge and spans the panel, and the panel behind it dims and blurs. The
  old popover was a plate three percent lighter than the panel with a shadow the
  dark ground swallowed, landing on top of full-contrast content that went on
  competing with it. Elevation is focus now, not altitude.
- The counts are the density model from `constants.js`, reached through a new
  `GET_DETAIL_ESTIMATE` message rather than re-derived in the panel, so the
  field can't drift from what the request will actually ask the model for. The
  bars are drawn to scale against the densest level and the reading carries the
  absolute figure, so no single bar claims to be a particular point. When the
  runtime can't be read, the field falls back to the proportions the static
  prompt implies and reads out the level instead of inventing a number.
- The estimate counts windows. A video over 90 minutes isn't summarised in one
  call — `planWindows` cuts it up and prices each window on its own length — so
  pricing the whole runtime once gave a different answer from the one the run
  would ask for (27 against 25 for a four-hour Brief, five roundings of 48
  minutes not being one rounding of 240). `detailEstimate` now makes the same
  split before adding the windows up.
- The reading is marked `≈`. The directive asks for a count and then explicitly
  invites going past it — there is no upper limit on points — and the real
  windows are measured from the transcript rather than the player. A bare
  number claimed a precision neither of those allows.
- The module follows the panel's theme — a graphite housing with an inset well
  on a dark panel, a near-white one on a light panel, each over its own veil.
- **The overview card is just the overview.** The gist of the whole video, in a
  paragraph, on one raised slab with room to breathe — and nothing else on it.
  Gone: the runtime, which is on the player an inch away; the reading time,
  which measured a document read end to end rather than a summary scanned until
  something looks worth watching; the point count, which restated the list
  directly underneath; and the age of the summary, which could only ever say
  "just now" because the cache lives for one page session. The model that wrote
  it stays, behind the detail chip, where it is a diagnosis rather than a
  greeting.
- The slab drops its border for a soft shadow — at a 14px radius a stroke reads
  as a box drawn around the text instead of a surface under it — takes 18px of
  padding, and sets the overview at 13.5px, the largest body size in the panel,
  since it is the only prose there. Its controls sit under a hairline so they
  read as a footer rather than a second paragraph. Both skins drop the figures;
  the slab treatment is *Quiet* only.
- A summary that arrives without an overview line no longer draws an empty card
  around a lone chip: the level stands on its own line and the slab is skipped.
- Settings' live preview follows, in both skins and both themes — it is meant to
  be a faithful miniature of the panel, so it loses the same figures and takes
  the same slab.
- The **Statistics** screen is now **Your usage**. "Statistics" promises analysis;
  the screen keeps a tally — summaries generated, watching time saved, video in
  against reading out — and "usage" is what that honestly is. It also keeps the
  possessive the settings nav uses to mark the screens that are about you rather
  than about the extension.
- **Fixed:** the Custom provider sheet's Cancel label sat high in its button. It
  carried the class `sec`, which is also this page's section layout class, and
  `.sec:first-of-type { padding-top: 0 }` won the specificity tie against the
  button's own padding. The button modifier is now `su-sec`, so the two cannot
  collide again.
- **Fixed:** with more than one provider configured, the first provider card sat
  flush against the "Summaries written by" selector, which had no bottom margin.
  It now keeps the same 10px the cards keep between themselves.
- **Fixed:** a provider with no icon of its own — which in practice means every
  custom one — was drawn with a dollar sign. It gets the plug the Custom provider
  sheet leads with instead, in the cards, the unconfigured list and the Auto
  selector alike.
- Deleting a custom provider moves out of the card header, where a lone red trash
  icon sat beside Replace key, and into the form that Replace key opens, beside
  the other destructive action. The key button reads "Remove key" on a custom
  provider now, since "Remove" alone said nothing next to "Delete provider".
  Deleting still releases the host permission that provider was granted; removing
  its key never did, which is why the two are separate buttons rather than one.
- **Fixed:** YouTube's chip-cloud scroll arrows painted over the open popover.
  The panel container is `position: relative` with `z-index: auto`, so it never
  established a stacking context and the popover's own `z-index` had nothing to
  be raised inside of. The container now takes a z-index while the popover is
  open and gives it back on close — below YouTube's dialog layer, so a real
  dialog still comes first. Both skins.
- *Quiet* skin only, apart from that fix. *Classic* keeps its lozenge slider and
  its chip-anchored popover, now built by its own function rather than sharing
  one with a pile of `if (quiet)` branches.

## 1.8.0 — 2026-09-16

### Added

- **Statistics is a bloom.** One seed per summary, placed on a sunflower
  spiral — seed *n* at angle *n*×137.5° and radius *c*√*n*, which is how a
  sunflower packs without gaps. It replaces the dot grid, which stopped at 120
  dots and then wrote `+N` for everything after. There is no cap now and no
  arithmetic to trust: ten thousand summaries is ten thousand seeds, on one
  canvas element, and the most recent dozen are lit.
- **What you put in, and what you read** — the total runtime you handed the
  extension against the time it takes to read what came back, and the ratio
  between them. This is the figure that says what the extension is for. Both
  sides are counted from the same first summary, so the pair always describes
  the same videos — including on a profile that had a long history before
  either counter existed.
- Three more figures from counters the extension already had in hand and threw
  away at the end of every summary: the **longest video** you have summarised,
  the **timestamps written** for you, and the **next round number** with how
  far into it you are. Plus **counting since**, from the date of the first
  summary — the only date kept, written once.

### Changed

- The headline total now rolls past hours into days and weeks. A heavy year
  used to read `12636h 6m`.

### Fixed

- **A key whose default model has been retired now lands on a current one.**
  The retired-model list knew about old Gemini and old Claude; it now also
  covers Claude 4.0 and 4.1, the GPT-3.5 and dated GPT-4 snapshots, the GPT-5.0
  snapshots and rolling chat aliases, and the dated reasoning models — with a
  model that has an announced shutdown counted as retired, because waiting for
  the date means migrating the release *after* summaries start failing.
- When a provider's default is not in a key's own listing, the model chosen to
  replace it is now the first one worth using — the provider's declared
  preference, then a cheap-tier match — rather than whichever id the listing
  happened to return first, which could be expensive or already retired.
  Saving a key that hits this case no longer writes back the very model that
  just failed and asks you to go and fix it yourself.
- Anthropic's model listing is fetched with `limit=1000`. It is ordered newest
  first and pages at 20, so the default was on course to fall off page one and
  a working key would have been told its own default was unavailable.
- Validating a key treats only a 401 as "this credential is bad". A restricted
  key that simply cannot list models answers 403 and generates perfectly well,
  and Gemini answers a bad key with 400 — a status a malformed request shares —
  so both now fall through to the probe that asks the question that matters.

### Removed

- *Ring width* never made it off the drawing board and into the product, and
  is not in the bloom either: it is √n, a fact about how the spiral packs
  rather than about the person reading it.

A counter added today knows nothing about the summaries you made before it, so
the new figures show a dash and say what they are waiting for rather than a
confident zero. They fill in over the next few summaries, once each — and
nothing on the screen mixes a new counter with an old one, which is the only
way a figure here could come out confidently wrong.

## 1.7.0 — 2026-09-16

### Changed

- **Summaries** and **Panel** are one screen. They were showing the same
  picture: both rendered the same preview from the same function, so the
  settings page drew the panel twice and neither copy demonstrated the other
  screen's controls — Detail could not show what it did to the look, and Theme
  and Design could not show what Detail did to the density. Detail, Theme and
  Design now sit together under **Summaries**, and all three drive one preview.
  The sidebar has four destinations instead of five.
- The preview stays with you as that screen scrolls, rather than sliding out of
  view at the moment you reach Design.

## 1.6.0 — 2026-09-16

### Removed

- **Open with a gist**, the switch for the overview line above the timestamps.
  The line is two or three sentences, it is written either way — the prompt and
  the validator both require it, and it travels inside the saved summary — and
  a screen with one Detail choice on it did not need a second decision guarding
  something that short. The overview now always shows.

### Fixed

- The panel preview on the **Summaries** and **Panel** screens is a faithful
  miniature again. It had drifted far enough to be misleading: Refined's header
  was invented (*Summary* with a detail chip, where the panel says *Timestamped
  Summary* with **Start over** and a collapse chevron, and keeps the chip in the
  overview card); the stats rail printed two figures instead of the panel's
  three; Original in light drew a white header where the panel draws a solid red
  bar on a grey shell; and a red-bordered row was labelled *open* when in the
  panel it means *playing now*, which also fills the time pill. Every value is
  now measured off the rendered panel, and the first row reads as the point
  playing now, which is where the panel sits for most of a video.
- Updating clears `SHOW_GIST` from local storage rather than leaving a setting
  behind that nothing reads.

## 1.5.0 — 2026-09-16

### Added

- A **Summaries** screen holding the Detail level every new summary starts at.
  It writes the same preference the panel's own Detail chip keeps, so changing
  it here updates an open panel without a reload.
- **Open with a gist**, a switch for the overview line above the timestamps.
  The line is always written and travels inside the saved summary, so hiding it
  costs nothing and turning it back on never needs another request.
- A **Statistics** screen: one dot per summary generated, the estimated time
  saved, the average per summary, and what that adds up to in feature films.
  The estimate is labelled as arithmetic on your own counter, not a measurement.
- A **live preview** on the Summaries and Panel screens showing the panel those
  settings produce — the real point count and timestamp spacing for the chosen
  Detail level, in the chosen theme and design.
- A **model selector** on the provider card, visible while connected instead of
  only inside the key form.

### Changed

- The settings page is rebuilt around five destinations — Summaries, Panel,
  Your AI, Statistics, About — each one screen, with no modals between them.
  It fills the window rather than sitting in a fixed-width card.
- The panel design choice is no longer *Classic* and *Quiet (new)*. It is
  **Original** and **Refined**, named for what the two designs do, and each has
  a thumbnail and a preview instead of a word you have to have already seen.
- A connected provider reads as a settled tile — mark, masked key, connection
  state and model — with the key form as a drawer opened by **Replace key**.
- About restates the privacy copy as a ledger of what leaves this computer,
  alongside the exact host permissions the manifest requests.
- The version is read from the manifest wherever the page prints it, so it can
  no longer drift out of date the way it had (the page read v1.2 at 1.4.0).

## 1.4.0 — 2026-09-10

### Added

- A guided first-run setup, opened automatically on install. It asks one
  question — where the writing should come from — and takes a single pasted
  key. You no longer have to say which provider the key belongs to: its shape
  identifies it, and setup checks it with that provider before saving anything.
  A key whose shape matches nothing known is offered the provider list instead
  of being guessed at.
- A toolbar popup. Before a key exists it is one **Add API key** button; after,
  a small status card naming the provider and model a summary would actually
  use. It never displays a key.
- A badge on the toolbar icon while no provider is configured — one honest
  signal that the extension cannot do anything yet, rather than a count.

### Changed

- Keys are validated by asking the provider for its model listing instead of by
  sending a real completion. Validation is now free, returns promptly, and no
  longer reports a good key as rejected merely because its tier cannot reach
  the provider's default model — in that case setup saves a model the key *can*
  reach and says which.
- The panel's primary button reads **Add API key** and opens the setup flow.
  The first-run tooltip that used to point at the settings gear is gone: the
  button now says outright what the gear had to explain.

### Removed

- Mistral is no longer a built-in provider. The built-ins are Gemini, OpenAI and
  Anthropic; every other service — Mistral included — is reached the same way,
  through **Add a custom provider** with the endpoint URL and your own key. For
  Mistral that is `https://api.mistral.ai/v1/chat/completions`.
- The standing host permission for `api.mistral.ai`. A custom provider asks
  Chrome for access to its own host when you save it, and hands it back when you
  delete it, so nothing needs a permanent grant.

### Fixed

- Updating cleans up after the removed provider instead of leaving it in your
  settings: a saved Mistral key and its model are dropped from local storage —
  nothing could read them any more, and no settings card was left to delete
  them — and a provider selection still naming Mistral falls back to **Auto**.
  Without that last part every summary would have failed with *Unknown
  provider* until you happened to reopen settings.

If Mistral was your only configured provider you will be asked for a key again;
re-adding it as a custom provider is the way back.

## 1.3.0 — 2026-09-09

### Added

- A current playback indicator: the summary point playing now is marked as the
  video moves, with a progress hairline across the row so a long chapter does
  not look the same at its start and its end. When that row scrolls out of
  view, a marker docks under the header carrying its timestamp and title — one
  control seeks the video there, the other scrolls the list back to it. The
  list never scrolls on its own.

### Changed

- Rewritten README: a screenshot tour of the panel, an install walkthrough for
  people who have never loaded an unpacked extension, a troubleshooting
  section, diagrams of the summary pipeline and the key-isolation boundary, and
  reference tables for detail levels, providers, permissions and the
  development commands.

### Fixed

- The panel is drawn in the user's own skin and detail level on first paint,
  instead of mounting with the module defaults and correcting itself once the
  background answered — which showed as Classic swapping to Quiet, and the
  Detail chip sliding off Standard, on every page load.

## 1.2 — 2026-09-08

First published release. The extension worked before this, but could only be
installed by cloning the repository.

### Added

- Timestamped, sectioned summaries in the YouTube sidebar, with click-to-seek on every point
- A briefing card above the chapter list: a short overview, the runtime, the number of points, the reading time and the detail level used
- Brief, Standard and In-depth detail levels
- A player-caption fallback for videos whose transcript panel is missing or unreadable, including members-only videos the signed-in account can play
- Windowed summarisation, so long videos are covered end to end rather than truncated
- Gemini, OpenAI, Anthropic, Mistral and custom endpoints, with an Auto mode that falls back across configured providers
- MIT license, contribution guide, issue templates, automated checks and a packaged release zip

### Changed

- Renamed from "YouTube Transcript Extractor" to "Timestamped Summary for YouTube"
- Site access narrowed from all sites to `youtube.com` plus the configured provider APIs
- API keys are no longer readable from content scripts; the panel asks the background only for display preferences and whether a provider is configured
- Errors are shown as a persistent message with a separate Retry, instead of replacing the Generate button's label

### Fixed

- A result is bound to the video and request that produced it, so navigating away mid-generation can no longer attach one video's summary to another
- Model output, provider errors and custom provider names are rendered as text, never as HTML
- Summaries are checked for structure and timestamp bounds before they replace the panel
- Retired default models replaced, and a model chosen as a fallback is now actually saved
