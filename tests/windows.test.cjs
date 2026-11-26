// Windowed generation: how a long video is split, and how the parts are run.
//
// The ordering test is the important one. Parts now finish in whatever order
// the network returns them, while the joined summary has to be in the video's
// order — a mistake there produces a summary that validates fine and reads as
// nonsense.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// The service worker registers chrome listeners at import time.
const noop = () => {};
globalThis.chrome = globalThis.chrome || {
  runtime: { onInstalled: { addListener: noop }, onStartup: { addListener: noop },
             onMessage: { addListener: noop }, getURL: (p) => p, lastError: null },
  action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
  storage: { local: { get: async () => ({}), set: async () => {} }, onChanged: { addListener: noop } },
  tabs: { create: noop, sendMessage: async () => {}, onUpdated: { addListener: noop }, onRemoved: { addListener: noop } },
  webNavigation: { onHistoryStateUpdated: { addListener: noop } }
};

const load = (rel) => import(path.join(__dirname, rel));

function buildTranscript(spanSeconds, step = 3) {
  const label = (t) => {
    const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = String(t % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${String(m).padStart(2, '0')}:${s}`;
  };
  const lines = [];
  for (let t = 0; t <= spanSeconds; t += step) lines.push(`[${label(t)}] words at ${t}`);
  return lines.join('\n') + '\n';
}

test('a video under the threshold stays a single request', async () => {
  const { planWindows } = await load('../scripts/transcript-windows.js');
  const { parseTranscriptCues } = await load('../scripts/summary-validator.js');
  const transcript = buildTranscript(60 * 60);
  assert.deepEqual(planWindows(transcript, parseTranscriptCues(transcript)), []);
});

test('a long video splits into ordered, disjoint windows covering every cue', async () => {
  const { planWindows } = await load('../scripts/transcript-windows.js');
  const { parseTranscriptCues } = await load('../scripts/summary-validator.js');

  const transcript = buildTranscript(5 * 3600 + 4 * 60);
  const cues = parseTranscriptCues(transcript);
  const windows = planWindows(transcript, cues);

  assert.ok(windows.length >= 6, `expected several windows, got ${windows.length}`);

  const seen = windows.flatMap((w) => parseTranscriptCues(w.transcript));
  assert.equal(seen.length, cues.length, 'no cue may be lost between windows');
  assert.equal(seen[0].seconds, cues[0].seconds);
  assert.equal(seen.at(-1).seconds, cues.at(-1).seconds);
  for (let i = 1; i < seen.length; i++) {
    assert.ok(seen[i].seconds > seen[i - 1].seconds, 'windows must not overlap or reorder');
  }
});

test('parts are joined in video order even when they finish out of order', async () => {
  const { generateWindowed } = await load('../background/service-worker.js');

  const windows = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
    index: n, count: 7, transcript: `part ${n}`, durationMinutes: 43
  }));

  // Later parts return first, which is what an unordered append would expose.
  const client = {
    callAPI: async (_key, transcript) => {
      const n = Number(transcript.split(' ')[1]);
      await new Promise((r) => setTimeout(r, (8 - n) * 12));
      return { text: '```\n#Part ' + n + '\n[00:0' + n + '] - T: d.\n```', finishReason: 'stop' };
    }
  };

  const result = await generateWindowed(client, 'k', windows, {}, async () => {}, () => false);
  const order = [...result.text.matchAll(/#Part (\d)/g)].map((m) => Number(m[1]));
  assert.deepEqual(order, [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(!result.text.includes('```'), 'per-part fences must be stripped before joining');
});

test('no more than four window requests are in flight at once', async () => {
  const { generateWindowed } = await load('../background/service-worker.js');

  let inFlight = 0;
  let peak = 0;
  const client = {
    callAPI: async () => {
      peak = Math.max(peak, ++inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return { text: '[00:01] - T: d.', finishReason: 'stop' };
    }
  };

  const windows = Array.from({ length: 9 }, (_, i) => ({
    index: i + 1, count: 9, transcript: `part ${i}`, durationMinutes: 43
  }));

  await generateWindowed(client, 'k', windows, {}, async () => {}, () => false);
  assert.ok(peak > 1, 'parts should run in parallel, not one at a time');
  assert.ok(peak <= 4, `concurrency should stay bounded, peaked at ${peak}`);
});

test('a rate-limited part is retried; a rejected key is not', async () => {
  const { generateWindowed } = await load('../background/service-worker.js');
  const { apiError, ERROR_CODES } = await load('../scripts/errors.js');

  let attempts = 0;
  const flaky = {
    callAPI: async () => {
      if (++attempts === 1) throw apiError(ERROR_CODES.RATE_LIMIT, 'slow down', 429);
      return { text: '[00:01] - T: d.', finishReason: 'stop' };
    }
  };
  const windows = [{ index: 1, count: 2, transcript: 'a', durationMinutes: 43 },
                   { index: 2, count: 2, transcript: 'b', durationMinutes: 43 }];

  const ok = await generateWindowed(flaky, 'k', windows, { wait: async () => {} }, async () => {}, () => false);
  assert.ok(ok.text.includes('T: d.'));
  assert.equal(attempts, 3, 'one retry plus the two successful calls');

  let authAttempts = 0;
  const rejected = {
    callAPI: async () => { authAttempts++; throw apiError(ERROR_CODES.AUTH, 'bad key', 401); }
  };
  await assert.rejects(
    () => generateWindowed(rejected, 'k', windows, {}, async () => {}, () => false),
    /bad key/
  );
  assert.ok(authAttempts <= windows.length, 'a rejected key must not be retried');
});

test('a truncated part fails the run rather than joining in half-written', async () => {
  const { generateWindowed } = await load('../background/service-worker.js');
  const client = {
    callAPI: async (_k, transcript) => ({
      text: '[00:01] - T: d.',
      finishReason: transcript === 'b' ? 'length' : 'stop'
    })
  };
  const windows = [{ index: 1, count: 2, transcript: 'a', durationMinutes: 43 },
                   { index: 2, count: 2, transcript: 'b', durationMinutes: 43 }];

  await assert.rejects(
    () => generateWindowed(client, 'k', windows, {}, async () => {}, () => false),
    /output limit/
  );
});

test('progress counts completed parts', async () => {
  const { generateWindowed } = await load('../background/service-worker.js');
  const seen = [];
  const client = { callAPI: async () => ({ text: '[00:01] - T: d.', finishReason: 'stop' }) };
  const windows = [1, 2, 3].map((n) => ({ index: n, count: 3, transcript: `p${n}`, durationMinutes: 43 }));

  await generateWindowed(client, 'k', windows, {}, async (m) => seen.push(m), () => false);
  assert.equal(seen[0], 'Generating summary... 0/3 parts');
  assert.equal(seen.at(-1), 'Generating summary... 3/3 parts');
});

test('a busy model (503) is waited out longer, and given up on after its last wait', async () => {
  const { callWithRetries, RETRY_WAITS, retryMessage } = await load('../background/service-worker.js');
  const { apiError, ERROR_CODES } = await load('../scripts/errors.js');
  const busy = () => apiError(ERROR_CODES.PROVIDER_DOWN, 'high demand', 503);

  const waited = [];
  const notices = [];
  let calls = 0;
  const reply = await callWithRetries(async () => {
    if (++calls < 3) throw busy();
    return 'done';
  }, { wait: async (ms) => waited.push(ms), onWait: (code, ms) => notices.push(retryMessage(code, ms)) });
  assert.equal(reply, 'done');
  assert.equal(waited.length, 2);
  assert.ok(waited[0] >= RETRY_WAITS[ERROR_CODES.PROVIDER_DOWN][0], 'a 503 waits longer than a rate limit');
  assert.ok(waited[1] > waited[0], 'and backs off');
  assert.match(notices[0], /busy, trying again in \d+s/);

  let tries = 0;
  await assert.rejects(
    callWithRetries(async () => { tries++; throw busy(); }, { wait: async () => {} }),
    /high demand/
  );
  assert.equal(tries, RETRY_WAITS[ERROR_CODES.PROVIDER_DOWN].length + 1);

  let stopped = 0;
  await assert.rejects(
    callWithRetries(async () => { stopped++; throw busy(); }, { wait: async () => {}, shouldStop: () => stopped > 0 }),
    /high demand/
  );
  assert.equal(stopped, 1, 'a run that was cancelled does not retry');
});

test('Try again reuses parts that finished in the failed run, and success clears them', async () => {
  const { generateWindowed, partCacheFor } = await load('../background/service-worker.js');
  const { apiError, ERROR_CODES } = await load('../scripts/errors.js');

  // An in-memory stand-in for chrome.storage.session.
  const data = {};
  const store = {
    get: async (key) => (key in data ? { [key]: structuredClone(data[key]) } : {}),
    set: async (obj) => { Object.assign(data, structuredClone(obj)); }
  };
  const windows = [{ index: 1, count: 2, transcript: 'a', durationMinutes: 43 },
                   { index: 2, count: 2, transcript: 'b', durationMinutes: 43 }];
  const opts = (run) => ({ wait: async () => {}, partCache: partCacheFor(run, store) });

  const asked = [];
  let partTwoDown = true;
  const client = {
    callAPI: async (_k, transcript) => {
      asked.push(transcript);
      if (transcript === 'b' && partTwoDown) throw apiError(ERROR_CODES.AUTH, 'part two failed', 401);
      return { text: `[00:01] - ${transcript}: d.`, finishReason: 'stop' };
    }
  };

  await assert.rejects(() => generateWindowed(client, 'k', windows, opts('run-1'), async () => {}, () => false), /part two failed/);
  assert.deepEqual(asked.sort(), ['a', 'b']);

  // Same request again: only the part that failed is sent.
  asked.length = 0;
  partTwoDown = false;
  const ok = await generateWindowed(client, 'k', windows, opts('run-1'), async () => {}, () => false);
  assert.deepEqual(asked, ['b']);
  assert.ok(ok.text.indexOf('a: d.') < ok.text.indexOf('b: d.'), 'kept part still joins in video order');

  // A different request (another model, level, video...) never borrows them,
  // and a finished run leaves nothing behind.
  asked.length = 0;
  await generateWindowed(client, 'k', windows, opts('run-2'), async () => {}, () => false);
  assert.deepEqual(asked.sort(), ['a', 'b']);
  assert.deepEqual(data.FINISHED_PARTS, []);
});

test('subscription providers split long videos into smaller parts, written together', async () => {
  const { planWindows } = await load('../scripts/transcript-windows.js');
  const { PROVIDERS } = await load('../scripts/providers.js');
  const { generateWindowed } = await load('../background/service-worker.js');
  const cuesFor = (minutes) => {
    const lines = [];
    for (let s = 0; s <= minutes * 60; s += 30) lines.push(`[${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}] words`);
    return { text: lines.join('\n'), cues: lines.map((_, i) => ({ seconds: i * 30 })) };
  };

  const ninety = cuesFor(90);
  const sub = PROVIDERS.claude_subscription.windowing;
  assert.equal(planWindows(ninety.text, ninety.cues, sub).length, 5, '90 minutes: five parts of 18 minutes');
  assert.equal(planWindows(ninety.text, ninety.cues, PROVIDERS.gemini.windowing || {}).length, 0, 'an API provider still sends it whole');
  const twenty = cuesFor(20);
  assert.equal(planWindows(twenty.text, twenty.cues, sub).length, 0, 'a short video is still one request');

  // All ten parts are in flight at once when the provider allows it.
  for (const id of ['claude_subscription', 'chatgpt_subscription', 'gemini_subscription']) {
    assert.equal(PROVIDERS[id].windowing.concurrency, 10);
  }
  let inFlight = 0, peak = 0;
  const client = {
    callAPI: async () => {
      peak = Math.max(peak, ++inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return { text: '[00:01] - T: d.', finishReason: 'stop' };
    }
  };
  const windows = Array.from({ length: 10 }, (_, i) => ({ index: i + 1, count: 10, transcript: String(i), durationMinutes: 20 }));
  await generateWindowed(client, 'k', windows, { concurrency: sub.concurrency }, async () => {}, () => false);
  assert.equal(peak, 10);
  peak = 0;
  await generateWindowed(client, 'k', windows, {}, async () => {}, () => false);
  assert.equal(peak, 4, 'everyone else keeps the default of four');
});
