// tests/model-defaults.test.cjs
//
// The promise this file pins down: a valid API key, pasted into either the
// first-run flow or the settings page, ends up configured with a model that
// the provider will actually accept. Three separate things used to break it —
// a truncated model listing, a key that cannot list models at all, and a
// fallback that saved the very model it had just called unavailable — and each
// of them surfaced as "your key doesn't work" for a key that did.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const load = (mod) => import(path.join(__dirname, '..', mod));

function stubFetch(handler) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body });
    return handler(String(url), init);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const anthropicList = (ids) => ({
  ok: true,
  status: 200,
  json: async () => ({ data: ids.map((id) => ({ id, display_name: id })) })
});
const openaiList = (ids) => ({
  ok: true,
  status: 200,
  json: async () => ({ data: ids.map((id) => ({ id })) })
});
const fail = (status, body = '{}') => ({
  ok: false,
  status,
  json: async () => JSON.parse(body),
  text: async () => body
});

// --- the defaults themselves -------------------------------------------------

test('each built-in default validates against a listing that contains it', async () => {
  const { PROVIDERS } = await load('scripts/providers.js');
  for (const id of ['openai', 'anthropic']) {
    const p = PROVIDERS[id];
    const stub = stubFetch(async (url) => {
      if (!/\/models/.test(url)) throw new Error(`${id}: validation must not generate`);
      return id === 'anthropic'
        ? anthropicList([p.defaultModel, 'something-else'])
        : openaiList([p.defaultModel, 'something-else']);
    });
    try {
      const result = await new p.clientClass(p).validateKey('k', p.defaultModel);
      assert.equal(result.status, 'valid', `${id} default should validate`);
      assert.equal(result.model, p.defaultModel);
    } finally { stub.restore(); }
  }
});

test('no built-in default is itself on the retired list', async () => {
  const { PROVIDERS, isRetiredModel } = await load('scripts/providers.js');
  for (const p of Object.values(PROVIDERS)) {
    assert.equal(isRetiredModel(p.id, p.defaultModel), false, `${p.id} default is retired`);
    for (const fallback of p.preferredModels || []) {
      assert.equal(isRetiredModel(p.id, fallback), false, `${p.id} fallback ${fallback} is retired`);
    }
  }
});

// --- 1. the truncated Anthropic listing --------------------------------------

test('Anthropic asks for the whole model list, not the first page', async () => {
  const { PROVIDERS } = await load('scripts/providers.js');
  const p = PROVIDERS.anthropic;
  const stub = stubFetch(async () => anthropicList([p.defaultModel]));
  try {
    await new p.clientClass(p).fetchModels('k');
    const listing = stub.calls.find((c) => c.url.includes('/v1/models'));
    // Without an explicit limit the API returns 20 newest-first, and the
    // default would eventually fall off the end of that page.
    assert.match(listing.url, /[?&]limit=1000\b/);
  } finally { stub.restore(); }
});

// --- 2. the key that cannot list models --------------------------------------

test('a key that may not list models is proven by the probe, not rejected', async () => {
  const { PROVIDERS } = await load('scripts/providers.js');
  const p = PROVIDERS.openai;
  // Exactly what a restricted OpenAI project key answers: 403 on /v1/models,
  // while chat/completions works perfectly well.
  const stub = stubFetch(async (url) => {
    if (url.endsWith('/v1/models')) return fail(403, '{"error":{"message":"insufficient permissions"}}');
    return { ok: true, status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: 'ok' } }] }) };
  });
  try {
    const result = await new p.clientClass(p).validateKey('sk-restricted', p.defaultModel);
    assert.equal(result.status, 'valid');
    assert.ok(stub.calls.some((c) => c.url.includes('chat/completions')), 'should fall through to the probe');
  } finally { stub.restore(); }
});

test('a genuinely bad key is still rejected on the listing alone', async () => {
  const { PROVIDERS } = await load('scripts/providers.js');
  for (const id of ['openai', 'anthropic']) {
    const p = PROVIDERS[id];
    const stub = stubFetch(async () => fail(401, '{"error":{"message":"invalid api key"}}'));
    try {
      const result = await new p.clientClass(p).validateKey('bad', p.defaultModel);
      assert.equal(result.status, 'invalid', `${id} should reject a 401 key`);
      assert.equal(stub.calls.length, 1, `${id} should not probe after a 401`);
    } finally { stub.restore(); }
  }
});

// --- 3. what gets saved when the default really is out of reach --------------

test('pickModel prefers the default, then the chain, and never a retired id', async () => {
  const { PROVIDERS, pickModel } = await load('scripts/providers.js');
  const openai = PROVIDERS.openai;

  assert.equal(pickModel(['gpt-4o-mini', 'gpt-5.6-sol'], openai), 'gpt-4o-mini');
  // Default gone: step down the declared chain rather than taking list order.
  assert.equal(pickModel(['gpt-5.6-sol', 'gpt-5.6-luna'], openai), 'gpt-5.6-luna');
  // Nothing from the chain: a cheap-tier name beats whatever came first.
  assert.equal(pickModel(['gpt-6-astra', 'gpt-4.1-nano'], openai), 'gpt-4.1-nano');
  // A retired id is never chosen while a current one is on offer.
  assert.equal(pickModel(['gpt-3.5-turbo', 'gpt-6-astra'], openai), 'gpt-6-astra');
  // Objects from a listing work as well as bare ids.
  assert.equal(pickModel([{ id: 'gpt-4o-mini' }], openai), 'gpt-4o-mini');
  // Nothing to choose from is not a crash.
  assert.equal(pickModel([], openai), openai.defaultModel);
});

test('an off-plan default resolves to a reachable model, with the list to prove it', async () => {
  const { PROVIDERS, pickModel } = await load('scripts/providers.js');
  const p = PROVIDERS.anthropic;
  const stub = stubFetch(async () => anthropicList(['claude-sonnet-5', 'claude-opus-5']));
  try {
    const result = await new p.clientClass(p).validateKey('k', p.defaultModel);
    assert.equal(result.status, 'model_unavailable');
    // Both the setup flow and the settings save path feed exactly this back
    // into pickModel; the answer has to be something the key can reach.
    const replacement = pickModel(result.models, p);
    assert.equal(replacement, 'claude-sonnet-5');
    assert.notEqual(replacement, result.model);
  } finally { stub.restore(); }
});

// --- retired-model patterns --------------------------------------------------

test('retired ids are recognised and current ones are left alone', async () => {
  const { isRetiredModel } = await load('scripts/providers.js');

  const retired = {
    anthropic: [
      'claude-1.3', 'claude-instant-1.2', 'claude-2.1', 'claude-3-opus-20240229',
      'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
      'claude-3-7-sonnet-20250219', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514',
      'claude-opus-4-1-20250805', 'claude-opus-4-1', 'claude-opus-4-0'
    ],
    openai: [
      'text-davinci-003', 'code-davinci-002', 'gpt-3.5-turbo', 'gpt-3.5-turbo-0301',
      'gpt-4-0613', 'gpt-4-32k', 'gpt-4-vision-preview', 'gpt-4o-2024-05-13',
      'gpt-5-2025-08-07', 'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07',
      'gpt-5-chat-latest', 'gpt-5.2-chat-latest', 'o3-2025-04-16', 'o4-mini-2025-04-16'
    ]
  };
  const current = {
    anthropic: [
      'claude-haiku-4-5-20251001', 'claude-haiku-4-5', 'claude-sonnet-4-5-20250929',
      'claude-sonnet-4-6', 'claude-opus-4-5-20251101', 'claude-opus-4-6',
      'claude-opus-4-7', 'claude-opus-4-8', 'claude-opus-5', 'claude-sonnet-5',
      'claude-fable-5-1', 'claude-mythos-5'
    ],
    openai: [
      'gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-5.6-luna',
      'gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-6-astra'
    ]
  };

  for (const [provider, ids] of Object.entries(retired)) {
    for (const id of ids) {
      assert.equal(isRetiredModel(provider, id), true, `${id} should be flagged retired`);
    }
  }
  for (const [provider, ids] of Object.entries(current)) {
    for (const id of ids) {
      assert.equal(isRetiredModel(provider, id), false, `${id} must not be flagged retired`);
    }
  }
});

// --- request shape -----------------------------------------------------------

test('newer OpenAI models get max_completion_tokens and no temperature', async () => {
  const { PROVIDERS } = await load('scripts/providers.js');
  const client = new PROVIDERS.openai.clientClass(PROVIDERS.openai);

  const legacy = client.buildBody('gpt-4o-mini', 'p', 500);
  assert.equal(legacy.max_tokens, 500);
  assert.equal(legacy.temperature, 0.3);
  assert.equal(legacy.max_completion_tokens, undefined);

  for (const id of ['gpt-5.6-luna', 'gpt-5-mini', 'o3', 'gpt-6-astra']) {
    const body = client.buildBody(id, 'p', 500);
    assert.equal(body.max_completion_tokens, 500, `${id} needs max_completion_tokens`);
    assert.equal(body.max_tokens, undefined, `${id} must not send max_tokens`);
    assert.equal(body.temperature, undefined, `${id} must not send temperature`);
  }
});

test('a custom OpenAI-compatible endpoint keeps the shape every server understands', async () => {
  const { OpenAICompatibleClient } = await load('scripts/openai-compatible-client.js');
  const client = new OpenAICompatibleClient({
    id: 'custom_1', name: 'Local', isCustom: true,
    endpoint: 'http://localhost:1234/v1/chat/completions', defaultModel: 'gpt-5-local'
  });
  const body = client.buildBody('gpt-5-local', 'p', 500);
  assert.equal(body.max_tokens, 500);
  assert.equal(body.max_completion_tokens, undefined);
});

test('temperature is sent only to the Claude generations that accept it', async () => {
  const { PROVIDERS } = await load('scripts/providers.js');
  const client = new PROVIDERS.anthropic.clientClass(PROVIDERS.anthropic);

  for (const id of ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-5-20251101']) {
    assert.equal(client.buildBody(id, 'p', 500).temperature, 0.3, `${id} accepts temperature`);
  }
  // Opus 4.7 and later reject a non-default temperature with a 400.
  for (const id of ['claude-opus-4-7', 'claude-opus-4-8', 'claude-opus-5', 'claude-sonnet-5', 'claude-fable-5-1']) {
    const body = client.buildBody(id, 'p', 500);
    assert.equal(body.temperature, undefined, `${id} must not be sent temperature`);
    assert.equal(body.max_tokens, 500);
  }
});
