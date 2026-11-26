// Summaries through a Claude, ChatGPT or Gemini subscription: the native helper
// that runs the CLIs, and the extension client that talks to it.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const load = (rel) => import(path.join(__dirname, rel));

// A stand-in CLI: prints the given lines to stdout, then exits with `code`.
// When `capturePath` is provided, writes argv and stdin JSON for assertions.
function fakeCli(lines, code = 0, stderr = '', capturePath = null) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-cli-'));
  const bin = path.join(dir, 'cli');
  fs.writeFileSync(bin, `#!${process.execPath}
const fs = require('node:fs');
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { stdin += c; });
process.stdin.on('end', () => {
  if (${JSON.stringify(capturePath)}) {
    fs.writeFileSync(${JSON.stringify(capturePath)}, JSON.stringify({ argv: process.argv.slice(2), stdin }));
  }
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
  const { PROVIDERS, configuredProviders, modelLabel } = await load('../scripts/providers.js');
  assert.equal(PROVIDERS.claude_subscription.cli, 'claude');
  assert.equal(PROVIDERS.chatgpt_subscription.cli, 'codex');
  assert.equal(PROVIDERS.gemini_subscription.cli, 'agy');
  assert.equal(PROVIDERS.gemini_subscription.defaultModel, 'gemini-4-hydrogen-low');
  assert.equal(PROVIDERS.gemini_subscription.defaultModelName, 'Gemini 4 Hydrogen');
  assert.equal(modelLabel(PROVIDERS.gemini_subscription, 'gemini-4-hydrogen-low'), '4 Hydrogen');
  assert.equal(modelLabel(PROVIDERS.gemini_subscription, 'gemini-3.8-flash-low'), '3.8 Flash');
  const ids = configuredProviders({
    CLAUDE_SUBSCRIPTION: 'connected',
    GEMINI_SUBSCRIPTION: 'connected'
  }).map((p) => p.id);
  assert.deepEqual(ids, ['claude_subscription', 'gemini_subscription']);
});

test('the helper lists only curated low-effort models without effort labels for agy', async () => {
  const bridge = await load('../native-host/bridge.mjs');

  assert.deepEqual(bridge.parseAgyModels(
    'gemini-4-hydrogen-high\tGemini 4 Hydrogen (High)\n' +
    'gemini-4-hydrogen-xhigh\tGemini 4 Hydrogen (XHigh)\n' +
    'gemini-3.8-flash-low  Gemini 3.8 Flash (Low)\n'
  ), [
    { id: 'gemini-4-hydrogen-high', name: 'Gemini 4 Hydrogen (High)' },
    { id: 'gemini-4-hydrogen-xhigh', name: 'Gemini 4 Hydrogen (XHigh)' },
    { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash (Low)' }
  ]);

  process.env.BRIDGE_AGY_BIN = fakeCli([
    'gemini-4-hydrogen-high\tGemini 4 Hydrogen (High)',
    'gemini-4-hydrogen-xhigh\tGemini 4 Hydrogen (XHigh)',
    'gemini-4-hydrogen-medium\tGemini 4 Hydrogen (Medium)',
    'gemini-4-hydrogen-low\tGemini 4 Hydrogen (Low)',
    'gemini-3.8-flash-high\tGemini 3.8 Flash (High)',
    'gemini-3.8-flash-low\tGemini 3.8 Flash (Low)',
    'claude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)',
    'gpt-oss-120b-medium\tGPT-OSS 120B (Medium)'
  ], 0, 'Fetching available models...\n');
  try {
    const res = await bridge.status('agy');
    assert.equal(res.ok, true);
    assert.equal(res.defaultModel, 'gemini-4-hydrogen-low');
    assert.deepEqual(res.models, [
      { id: 'gemini-4-hydrogen-low', name: 'Gemini 4 Hydrogen' },
      { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash' }
    ]);
  } finally {
    delete process.env.BRIDGE_AGY_BIN;
  }

  process.env.BRIDGE_AGY_BIN = fakeCli(
    [],
    1,
    'Error: Please sign in to view available models. Launch the CLI without arguments to sign in.\n'
  );
  try {
    const res = await bridge.status('agy');
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'signed_out');
  } finally {
    delete process.env.BRIDGE_AGY_BIN;
  }

  process.env.BRIDGE_AGY_BIN = path.join(os.tmpdir(), 'no-such-agy-here');
  try {
    const res = await bridge.status('agy');
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'not_installed');
  } finally {
    delete process.env.BRIDGE_AGY_BIN;
  }
});

test('the helper streams agy replies, skips non-response steps, and classifies agy errors', async () => {
  const bridge = await load('../native-host/bridge.mjs');
  const capturePath = path.join(os.tmpdir(), `agy-capture-${process.pid}.json`);

  process.env.BRIDGE_AGY_BIN = fakeCli([
    JSON.stringify({ event: 'init', conversation_id: 'c1', init: { model: 'gemini-4-hydrogen-xhigh' } }),
    JSON.stringify({ event: 'step_update', step_update: { step_index: 0, state: 'DONE', step_type: 'user_input' } }),
    JSON.stringify({ event: 'step_update', step_update: { step_index: 1, state: 'ACTIVE', step_type: 'thought', text_delta: 'internal thought ' } }),
    JSON.stringify({ event: 'step_update', step_update: { step_index: 2, state: 'ACTIVE', step_type: 'agent_response', text_delta: '[00:00] - A: ' } }),
    JSON.stringify({ event: 'step_update', step_update: { step_index: 2, state: 'DONE', step_type: 'agent_response', text_delta: 'b.' } }),
    JSON.stringify({ event: 'result', result: { status: 'SUCCESS', response: '[00:00] - A: b.' } })
  ], 0, '', capturePath);
  try {
    const seen = await runGenerate(bridge, { cli: 'agy', model: 'gemini-4-hydrogen-xhigh', prompt: 'Summarize transcript' });
    assert.deepEqual(seen.filter((m) => m.type === 'delta').map((m) => m.text), ['[00:00] - A: ', 'b.']);
    assert.ok(seen.some((m) => m.type === 'activity'));
    assert.deepEqual(seen.at(-1), { type: 'done', text: '[00:00] - A: b.', finishReason: null });

    const captured = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
    assert.ok(captured.argv.includes('--output-format'));
    assert.ok(captured.argv.includes('stream-json'));
    assert.ok(captured.argv.includes('--input-format'));
    assert.ok(captured.argv.includes('--sandbox'));
    assert.ok(captured.argv.includes('--disable-slash-commands'));
    assert.ok(captured.argv.includes('--model'));
    assert.ok(captured.argv.includes('gemini-4-hydrogen-xhigh'));
    const stdinEvent = JSON.parse(captured.stdin.trim());
    assert.equal(stdinEvent.event, 'user');
    assert.match(stdinEvent.message.content, /Summarize transcript$/);
  } finally {
    delete process.env.BRIDGE_AGY_BIN;
    fs.rmSync(capturePath, { force: true });
  }

  process.env.BRIDGE_AGY_BIN = fakeCli([
    JSON.stringify({
      event: 'result',
      result: {
        status: 'ERROR',
        response: '',
        error: 'invalid model selection (--model "bad-model"): model bad-model is not recognized as a known model',
        finished_reason: 'error'
      }
    })
  ], 1);
  try {
    const seen = await runGenerate(bridge, { cli: 'agy', model: 'bad-model', prompt: 'p' });
    assert.equal(seen.at(-1).type, 'error');
    assert.equal(seen.at(-1).code, 'model_unavailable');
  } finally {
    delete process.env.BRIDGE_AGY_BIN;
  }

  assert.equal(bridge.classifyFailure('Error: Please sign in to view available models.'), 'auth');
  assert.equal(bridge.classifyFailure('RESOURCE_EXHAUSTED: quota exceeded'), 'rate_limit');
});

test('the subscription client maps model_unavailable errors from the helper', async () => {
  const { SubscriptionClient } = await load('../scripts/subscription-client.js');
  const { restore } = withNativePort((msg, port) => {
    port.send({ type: 'error', code: 'model_unavailable', message: 'Gemini: invalid model selection' });
  });
  try {
    const client = new SubscriptionClient({ cli: 'agy', defaultModel: 'gemini-4-hydrogen-low' });
    await assert.rejects(client.callAPI('connected', 't', {}), (err) => err.code === 'model_unavailable');
  } finally {
    restore();
  }
});
