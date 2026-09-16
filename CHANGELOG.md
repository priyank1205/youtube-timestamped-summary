# Changelog

Notable changes to the extension. Version numbers match `manifest.json`, and
every released version has an entry here and on the
[Releases page](https://github.com/priyank1205/yt-transcript-ext/releases).

Write new entries under **Unreleased** as you go; `npm run bump` moves that
section under the new version number when you release.

## Unreleased

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
