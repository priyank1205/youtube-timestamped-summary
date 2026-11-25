// Summaries through a Claude or ChatGPT subscription: the native helper that
// runs the CLIs, and the extension client that talks to it.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const load = (rel) => import(path.join(__dirname, rel));

// A stand-in CLI: prints the given lines to stdout, then exits with `code`.
function fakeCli(lines, code = 0, stderr = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-cli-'));
  const bin = path.join(dir, 'cli');
  fs.writeFileSync(bin, `#!${process.execPath}
process.stdin.resume();
process.stdin.on('end', () => {
  for (const line of ${JSON.stringify(lines)}) process.stdout.write(line + '\\n');
  if (${JSON.stringify(stderr)}) process.stderr.write(${JSON.stringify(stderr)});
  process.exit(${code});
});
`);
  fs.chmodSync(bin, 0o755);
  return bin;
}

function runGenerate(bridge, request) {
  return new Promise((resolve) => {
    const seen = [];
    bridge.generate(request, (msg) => {
      seen.push(msg);
      if (msg.type === 'done' || msg.type === 'error') resolve(seen);
    });
  });
}

test('the helper frames messages the way native messaging expects', async () => {
  const bridge = await load('../native-host/bridge.mjs');
  const got = [];
  const decode = bridge.createDecoder((m) => got.push(m));
  const bytes = Buffer.concat([bridge.encodeMessage({ a: 1 }), bridge.encodeMessage({ b: 'é' })]);
  // Split mid-header and mid-body: chunks arrive however the pipe likes.
  decode(bytes.subarray(0, 2));
  decode(bytes.subarray(2, 9));
  decode(bytes.subarray(9));
  assert.deepEqual(got, [{ a: 1 }, { b: 'é' }]);
  assert.equal(bridge.encodeMessage({ a: 1 }).readUInt32LE(0), Buffer.byteLength('{"a":1}'));
});

test('the helper streams Claude\'s reply and reports how it stopped', async () => {
  const bridge = await load('../native-host/bridge.mjs');
  process.env.BRIDGE_CLAUDE_BIN = fakeCli([
    JSON.stringify({ type: 'system' }),
    JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: '[00:00] - A: ' } } }),
    JSON.stringify({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'b.' } } }),
    JSON.stringify({ type: 'result', is_error: false, result: '[00:00] - A: b.', stop_reason: 'end_turn' })
  ]);
  try {
    const seen = await runGenerate(bridge, { cli: 'claude', model: 'claude-sonnet-5-5', prompt: 'p' });
    assert.deepEqual(seen.filter((m) => m.type === 'delta').map((m) => m.text), ['[00:00] - A: ', 'b.']);
    assert.deepEqual(seen.at(-1), { type: 'done', text: '[00:00] - A: b.', finishReason: 'end_turn' });
  } finally {
    delete process.env.BRIDGE_CLAUDE_BIN;
  }
});

test('the helper turns a CLI failure into a code the extension knows', async () => {
  const bridge = await load('../native-host/bridge.mjs');
  process.env.BRIDGE_CLAUDE_BIN = fakeCli([
    JSON.stringify({ type: 'result', is_error: true, result: 'Claude usage limit reached. Your limit resets at 5pm.' })
  ], 1);
  try {
    const seen = await runGenerate(bridge, { cli: 'claude', prompt: 'p' });
    assert.equal(seen.at(-1).type, 'error');
    assert.equal(seen.at(-1).code, 'rate_limit');
  } finally {
    delete process.env.BRIDGE_CLAUDE_BIN;
  }
  assert.equal(bridge.classifyFailure('Not logged in · Please run /login'), 'auth');
  assert.equal(bridge.classifyFailure('API Error: 529 overloaded'), 'provider_down');
  assert.equal(bridge.classifyFailure('something odd'), 'cli_failed');

  process.env.BRIDGE_CLAUDE_BIN = path.join(os.tmpdir(), 'no-such-cli-here');
  try {
    const seen = await runGenerate(bridge, { cli: 'claude', prompt: 'p' });
    assert.equal(seen.at(-1).code, 'not_installed');
  } finally {
    delete process.env.BRIDGE_CLAUDE_BIN;
  }
});

// A fake chrome.runtime.connectNative: `script(posted, port)` plays the helper.
function withNativePort(script) {
  const original = globalThis.chrome;
  const state = { disconnected: false, posted: [] };
  globalThis.chrome = {
    runtime: {
      lastError: null,
      connectNative: () => {
        const listeners = { message: [], disconnect: [] };
        const port = {
          onMessage: { addListener: (fn) => listeners.message.push(fn) },
          onDisconnect: { addListener: (fn) => listeners.disconnect.push(fn) },
          postMessage: (msg) => {
            state.posted.push(msg);
            queueMicrotask(() => script(msg, {
              send: (m) => listeners.message.forEach((fn) => fn(m)),
              drop: (reason) => {
                globalThis.chrome.runtime.lastError = reason ? { message: reason } : null;
                listeners.disconnect.forEach((fn) => fn());
              }
            }));
          },
          disconnect: () => { state.disconnected = true; }
        };
        return port;
      }
    }
  };
  return { state, restore: () => { globalThis.chrome = original; } };
}

test('the subscription client collects a streamed summary and reports activity', async () => {
  const { SubscriptionClient } = await load('../scripts/subscription-client.js');
  const { state, restore } = withNativePort((msg, port) => {
    port.send({ type: 'activity' });
    port.send({ type: 'delta', text: '[00:00] - A: b.' });
    port.send({ type: 'done', text: '[00:00] - A: b.', finishReason: 'end_turn' });
  });
  try {
    let beats = 0;
    const client = new SubscriptionClient({ cli: 'claude', defaultModel: 'claude-sonnet-5-5' });
    const reply = await client.callAPI('connected', 'transcript', { length: 'standard', onActivity: () => beats++ });
    assert.deepEqual(reply, { text: '[00:00] - A: b.', finishReason: 'end_turn' });
    assert.equal(beats, 2);
    assert.equal(state.posted[0].type, 'generate');
    assert.equal(state.posted[0].cli, 'claude');
    assert.equal(state.posted[0].model, 'claude-sonnet-5-5');
    assert.match(state.posted[0].prompt, /Here is the transcript: transcript$/);
    assert.ok(state.disconnected, 'the port is closed once the reply is in');
  } finally {
    restore();
  }
});

test('the subscription client names a missing helper, and a signed-out CLI', async () => {
  const { SubscriptionClient } = await load('../scripts/subscription-client.js');
  const client = new SubscriptionClient({ cli: 'codex', defaultModel: 'default' });

  let mock = withNativePort((msg, port) => port.drop('Specified native messaging host not found.'));
  try {
    await assert.rejects(client.callAPI('connected', 't', {}), (err) => err.code === 'local_helper' && /install\.sh/.test(err.message));
    assert.equal((await client.validateKey('connected', 'default')).status, 'unreachable');
  } finally {
    mock.restore();
  }

  mock = withNativePort((msg, port) => port.send({ type: 'status', ok: false, reason: 'signed_out', message: 'Codex is signed out.' }));
  try {
    const res = await client.validateKey('connected', 'default');
    assert.equal(res.status, 'invalid');
    assert.equal(res.message, 'Codex is signed out.');
  } finally {
    mock.restore();
  }

  mock = withNativePort((msg, port) => port.send({ type: 'status', ok: true, models: [{ id: 'default' }, { id: 'gpt-6-luna' }] }));
  try {
    assert.equal((await client.validateKey('connected', 'default')).status, 'valid');
    assert.equal((await client.validateKey('connected', 'retired-model')).status, 'model_unavailable');
  } finally {
    mock.restore();
  }

  const original = globalThis.chrome;
  globalThis.chrome = { runtime: {} };
  try {
    await assert.rejects(client.callAPI('connected', 't', {}), (err) => err.code === 'permission');
  } finally {
    globalThis.chrome = original;
  }
});

test('cancelling a subscription summary closes the port, which stops the CLI', async () => {
  const { SubscriptionClient } = await load('../scripts/subscription-client.js');
  const { state, restore } = withNativePort(() => { /* never answers */ });
  try {
    const controller = new AbortController();
    const client = new SubscriptionClient({ cli: 'claude', defaultModel: 'claude-sonnet-5-5' });
    const pending = client.callAPI('connected', 't', { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, (err) => err.name === 'AbortError');
    assert.ok(state.disconnected);
  } finally {
    restore();
  }
});

test('subscription providers count as configured once connected', async () => {
  const { PROVIDERS, configuredProviders } = await load('../scripts/providers.js');
  assert.equal(PROVIDERS.claude_subscription.cli, 'claude');
  assert.equal(PROVIDERS.chatgpt_subscription.cli, 'codex');
  const ids = configuredProviders({ CLAUDE_SUBSCRIPTION: 'connected' }).map((p) => p.id);
  assert.deepEqual(ids, ['claude_subscription']);
});
