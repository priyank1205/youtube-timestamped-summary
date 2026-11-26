# AGENTS.md

Context and working rules for AI agents (Claude Code, Codex and others) on this
repository. Humans: [CONTRIBUTING.md](CONTRIBUTING.md) has the same ground in
longer form, and [README.md](README.md) explains the product and its design
decisions.

## What this is

**Timestamped Summary for YouTube**, a Chrome extension (Manifest V3) that adds
a panel to the YouTube watch-page sidebar. It reads the video's transcript,
asks an LLM for a sectioned summary whose every point carries a timestamp,
checks those timestamps against the transcript, and renders rows that jump the
video when clicked.

- Plain ES modules, no framework, no build step, no TypeScript, no runtime
  dependencies. What is in the repo is what the browser loads.
- Node 20+ is only needed for the tests and tooling.
- Runs in Chrome and other Chromium browsers. The owner uses **Arc** day to
  day, where it is loaded unpacked from this folder.

## How a summary is made

1. **Panel (content scripts, inside YouTube's page).** `scripts/ui-builder.js`
   draws the panel and its Detail control (Brief / Standard / In-depth, stored
   as `brief` / `standard` / `detailed`). `content-main.js` routes messages;
   `dom-observer.js` waits for YouTube's sidebar (`#secondary`) and mounts the
   panel into it.
2. **Transcript.** `transcript-engine.js` reads YouTube's transcript panel into
   `[mm:ss] words` cues. If that fails, `caption-reader.js` falls back to
   caption tracks that `caption-capture.js` (a MAIN-world script started with
   the page) copied as the player loaded them.
3. **Service worker** (`background/service-worker.js`) owns everything with a
   key. `START_ANALYSIS` from the panel → pick the provider (`SELECTED_MODEL`,
   or `auto` = every configured provider in order) → fetch the transcript →
   plan windows → call the provider → validate → send the result back.
   Progress goes to the panel as `PROGRESS_UPDATE` messages, which also re-arm
   the panel's 120-second "no progress" timeout.
4. **Prompt.** `scripts/constants.js` composes it. Point and section counts are
   computed from the video's runtime, not left to the model. Required output:

   ```
   >Overview sentences
   #Section Heading
   [12:34] - Title: Description
   ```
5. **Windows.** `scripts/transcript-windows.js` splits long videos into
   consecutive parts, each its own request; `generateWindowed` in the service
   worker runs them in parallel and joins them in video order. API providers
   split above 90 minutes into ~45-minute parts (4 at a time); subscription
   providers set their own `windowing` in `providers.js` (above 25 minutes,
   ~20-minute parts, 10 at a time).
6. **Validation.** `scripts/summary-validator.js` checks every timestamp lands
   on a real cue, in order and in range. A reply that loses more than half its
   points to that check is refused as a whole. A cut-off reply
   (`finishReason` `length` / `max_tokens`) is refused too.
7. **Errors.** Every failure carries a code from `scripts/errors.js`;
   `classifyError` turns it into the title, detail and actions the panel shows.
   **Copy details** builds a report that strips keys and signed URLs.

## Providers

Registry: `scripts/providers.js`. Every client extends `scripts/llm-client.js`
and implements `callAPI` (returns `{ text, finishReason }`), `validateKey`,
`fetchModels` and `getModelName`.

| Provider | Client | Notes |
|---|---|---|
| Google Gemini | `gemini-client.js` | Streams (`streamGenerateContent?alt=sse`). Thinking models get extra output budget, from the model's own `thinking` / `outputTokenLimit`. Default `gemini-flash-lite-latest`. |
| OpenAI | `openai-compatible-client.js` | Also used for user-added custom endpoints (`CUSTOM_PROVIDERS`). |
| Anthropic | `anthropic-client.js` | |
| Claude / ChatGPT / Gemini subscription | `subscription-client.js` | No key. Talks over native messaging to the helper in `native-host/`, which runs the signed-in `claude`, `codex` or `agy` CLI. See below. |

Retries live in `callWithRetries` in the service worker. Busy-model errors
(`provider_down`, usually a 503 "high demand") wait about 5, 12 and 25 seconds;
rate limits, network errors and timeouts wait 1.5 and 3 seconds; everything
else fails at once. Parts that finished in a failed windowed run are kept in
`chrome.storage.session` (`partCacheFor`), so Try again only redoes what
failed.

### The subscription helper (`native-host/`)

- `bridge.mjs` is a native messaging host: 4-byte little-endian length, then
  JSON. One port per request: `status` → `{ ok, models, defaultModel }`;
  `generate` → `delta` / `activity` messages, then `done` or `error`. Closing
  the port kills the CLI.
- `install.sh` copies it to `~/Library/Application Support/TimestampedSummary/`,
  records the absolute paths of `node`, `claude`, `codex` and `agy`, and registers host
  `com.timestamped_summary.bridge` with every Chromium browser it finds (Arc's
  folder is `Arc/User Data/NativeMessagingHosts`). The allowed extension ID is
  the unpacked ID of the folder it runs from.
- The browser starts the helper with a bare environment. Claude Code needs
  `USER` set to find its Keychain sign-in, so the launcher sets it.
- Each launch and each run's duration go to `bridge.log` in that folder: the
  first place to look when subscription summaries fail or are slow.
- `nativeMessaging` is an optional permission, asked for when a subscription is
  first connected. Some browsers enable `chrome.runtime.connectNative` only for
  pages opened after that, hence the "reload this page" hint in settings.

## Rules that must not break

- **API keys never reach a content script.** `chrome.storage.local` is set to
  `TRUSTED_CONTEXTS`; the panel only ever learns display preferences and one
  boolean saying whether a provider is configured.
- **Model output, provider errors and custom provider names are untrusted.**
  They reach the DOM through `textContent` or created text nodes, never
  `innerHTML`. Only strings hard-coded in `providers.js` (icons, help steps)
  are injected as HTML.
- **The transcript is data, not instructions.** The prompt says so; keep it.
- **A result belongs to the request that made it.** Every generation is bound
  to a tab, video id and request id; check `stale()` after every `await` in
  the service worker, and pass `signal` to anything that fetches.
- **Never ship a timeline the validator rejected.**
- **No new required permissions** without a strong reason: adding one disables
  the extension for existing users until they accept it. Prefer
  `optional_permissions`.

## Where to change what

| To change | Look in |
|---|---|
| Prompt wording, point counts, output budget | `scripts/constants.js` |
| Long-video splitting | `scripts/transcript-windows.js`, `windowing` in `providers.js` |
| Retries, provider order, part cache, messaging | `background/service-worker.js` |
| What a failure says | `scripts/errors.js` |
| Add a provider | a client in `scripts/`, an entry in `PROVIDERS`, its API domain in `host_permissions` |
| Panel UI | `scripts/ui-builder.js`, `styles/content.css` (Classic), `styles/skin-quiet.css` (Quiet) |
| Settings page | `options/options.js`, `options/options.html` (styles are inline) |
| Toolbar popup | `popup/` |
| Release tooling | `tools/` |

## Checking your work

- `npm run check` runs the manifest check and every unit test (`node --test
  tests/*.test.cjs`). It needs no network and makes no LLM calls. Add tests
  next to the code you change; new suites go in `tests/` as `*.test.cjs`.
- The panel without a reload loop: serve the repo root and open
  `dev/preview.html`, which loads the real `ui-builder.js` with stubbed
  `chrome.*` APIs.
- The settings page renders statically from `options/options.html` (its
  `chrome.*` calls fail, but the layout and CSS can be checked).
- Behaviour that needs the real extension (provider calls, native messaging,
  permissions) can't be driven from an agent's browser. Say what you could not
  verify, and ask the owner to reload the extension and try it.
- Before changing anything in `native-host/`, test it with a small driver that
  frames messages and spawns `bridge.mjs` (or the installed `run-bridge.sh`
  with a bare `env`). Real CLI calls use the owner's subscription, so keep
  test prompts tiny.

## After you build a feature

Work through this before calling the work done:

1. **`npm run check` passes**, with tests for the new behaviour.
2. **Check it where you can** (preview page, static settings page, a driver for
   the helper), and state plainly what needs the owner's own browser.
3. **`CHANGELOG.md`:** add the change under **Unreleased**, in the existing
   voice: bold one-line summary, then what changed for the user and why.
4. **`README.md`:** update it if the change is user-visible (setup, providers,
   settings, troubleshooting, the design-decision notes).
5. **New top-level folder?** Add it to the `cp` line in `tools/package.sh`, or
   it is silently missing from the release zip. `npm run package` builds the
   zip and fails if a file the extension loads is missing. It overwrites
   `dist/<name>-v<version>.zip`, so don't run it casually on a released
   version.
6. **New dev-only file or folder at the top level** (docs for contributors,
   tooling, fixtures)? Add it to `.gitattributes` as `export-ignore`, so it
   stays out of the "Source code" downloads GitHub attaches to each release.
   The release zip is separate: it only takes what `tools/package.sh` copies.
7. **Changed `native-host/bridge.mjs` or `install.sh`?** Rerun
   `bash native-host/install.sh`. The browser runs the installed copy, not the
   repo's.
8. **Changed the manifest?** Run `npm run test:manifest`, and remind the owner
   to reload the extension in `arc://extensions` and refresh open YouTube tabs.
9. **Commit only when asked.** Commits end with the co-author line your
   harness gives you. The owner has asked for direct commits to `main` before;
   ask if unsure.

### Releasing (only when asked)

1. The changelog entry must already be under **Unreleased**.
2. `npm run bump -- patch|minor|major` raises the version in `manifest.json`
   and `package.json` together and moves Unreleased under the new version.
   Features are `minor`, fixes `patch`.
3. Commit as `Release X.Y.Z`, separate from the feature commit, and push to
   `main`.
4. `.github/workflows/release.yml` sees the new version, re-runs the checks,
   builds the zip, tags `vX.Y.Z` and publishes the GitHub release with that
   version's changelog section as notes. Don't create the tag or release by
   hand. Wait for the Release and CI runs (`gh run watch <id>`) and confirm
   with `gh release view vX.Y.Z`.

## Out of bounds

- `video/` holds untracked promo-film work, not part of the extension. Don't
  touch it unless the task is about the films, and never overwrite an existing
  film's output.
- `audit/`, `ROADMAP.md` and `dist/` are git-ignored local files.
- `.claude/` holds this machine's editor settings (`launch.json` serves the
  repo on port 8123 for previews).
