const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

test('Gemini provider configuration has Gemini Flash-Lite Latest as default', async () => {
  const { PROVIDERS } = await import(path.join(__dirname, '../scripts/providers.js'));
  const gemini = PROVIDERS.gemini;

  assert.equal(gemini.defaultModel, 'gemini-flash-lite-latest');
  assert.equal(gemini.defaultModelName, 'Gemini Flash-Lite Latest');
  assert.ok(gemini.endpoint.includes('gemini-flash-lite-latest'));
});

test('GeminiClient defaults to gemini-flash-lite-latest and prioritizes it in fetchModels', async () => {
  const { GeminiClient } = await import(path.join(__dirname, '../scripts/gemini-client.js'));
  const client = new GeminiClient();

  // Test fetchModels injection when not in API response
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (url.includes('/models?')) {
        return {
          ok: true,
          json: async () => ({
            models: [
              { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', supportedGenerationMethods: ['generateContent'] }
            ]
          })
        };
      }
      return { ok: true, json: async () => ({}) };
    };

    const models = await client.fetchModels('fake-key');
    assert.ok(models.length >= 3);
    assert.equal(models[0].id, 'gemini-flash-lite-latest');
    assert.equal(models[0].name, 'Gemini Flash-Lite Latest');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GeminiClient fetchModels places gemini-flash-lite-latest at top if already in response', async () => {
  const { GeminiClient } = await import(path.join(__dirname, '../scripts/gemini-client.js'));
  const client = new GeminiClient();

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (url.includes('/models?')) {
        return {
          ok: true,
          json: async () => ({
            models: [
              { name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', supportedGenerationMethods: ['generateContent'] },
              { name: 'models/gemini-flash-lite-latest', displayName: 'Gemini Flash-Lite Latest', supportedGenerationMethods: ['generateContent'] }
            ]
          })
        };
      }
      return { ok: true, json: async () => ({}) };
    };

    const models = await client.fetchModels('fake-key');
    assert.equal(models[0].id, 'gemini-flash-lite-latest');
    assert.equal(models[0].name, 'Gemini Flash-Lite Latest');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GeminiClient callAPI uses explicit modelId when provided', async () => {
  const { GeminiClient } = await import(path.join(__dirname, '../scripts/gemini-client.js'));
  const client = new GeminiClient();

  let requestedUrl = '';
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      requestedUrl = url;
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Summary result' }] } }]
        })
      };
    };

    // When user selected another model, like gemini-1.5-pro
    await client.callAPI('test-key', 'sample transcript', { modelId: 'gemini-1.5-pro' });
    assert.ok(requestedUrl.includes('/models/gemini-1.5-pro:streamGenerateContent'), `Expected URL to include gemini-1.5-pro, got: ${requestedUrl}`);

    // When no model is specified, it defaults to gemini-flash-lite-latest
    await client.callAPI('test-key', 'sample transcript', {});
    assert.ok(requestedUrl.includes('/models/gemini-flash-lite-latest:streamGenerateContent'), `Expected URL to include gemini-flash-lite-latest, got: ${requestedUrl}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


// Runs one generation against a stubbed API and returns the maxOutputTokens it sent.
async function sentOutputBudget(modelResponse, modelId) {
  const { GeminiClient } = await import(path.join(__dirname, '../scripts/gemini-client.js'));
  GeminiClient.modelInfoCache.clear();
  const client = new GeminiClient();
  let sent = null;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init = {}) => {
      if (url.includes(':streamGenerateContent')) {
        sent = JSON.parse(init.body).generationConfig.maxOutputTokens;
        return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }) };
      }
      return modelResponse();
    };
    await client.callAPI('test-key', 'sample transcript', { modelId, length: 'detailed' });
  } finally {
    globalThis.fetch = originalFetch;
  }
  return sent;
}

test('Gemini thinking models get room to think on top of the summary budget, within their limit', async () => {
  const { outputBudgetFor } = await import(path.join(__dirname, '../scripts/constants.js'));
  const budget = outputBudgetFor({ length: 'detailed' });

  const roomy = await sentOutputBudget(
    () => ({ ok: true, json: async () => ({ thinking: true, outputTokenLimit: 65536 }) }), 'gemini-4-hydrogen');
  assert.equal(roomy, budget + 16384);

  const capped = await sentOutputBudget(
    () => ({ ok: true, json: async () => ({ thinking: true, outputTokenLimit: budget + 1000 }) }), 'small-thinker');
  assert.equal(capped, budget + 1000);
});

test('Gemini non-thinking models, and failed lookups, keep the summary budget', async () => {
  const { outputBudgetFor } = await import(path.join(__dirname, '../scripts/constants.js'));
  const budget = outputBudgetFor({ length: 'detailed' });

  assert.equal(await sentOutputBudget(
    () => ({ ok: true, json: async () => ({ thinking: false, outputTokenLimit: 8192 }) }), 'plain'), budget);
  assert.equal(await sentOutputBudget(() => ({ ok: false, json: async () => ({}) }), 'unknown'), budget);
  assert.equal(await sentOutputBudget(() => { throw new Error('offline'); }, 'offline'), budget);
});

// Streams the given SSE events (or a failing status) back to one generation.
async function streamed(respond) {
  const { GeminiClient } = await import(path.join(__dirname, '../scripts/gemini-client.js'));
  GeminiClient.modelInfoCache.clear();
  const client = new GeminiClient();
  let beats = 0;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => (url.includes(':streamGenerateContent')
      ? respond()
      : new Response('{}', { status: 200 }));
    const reply = await client.callAPI('test-key', 'sample transcript', { onActivity: () => beats++ });
    return { reply, beats };
  } finally {
    globalThis.fetch = originalFetch;
  }
}
const sse = (...events) => new Response(events.map((e) => `data: ${JSON.stringify(e)}\r\n\r\n`).join(''));

test('Gemini streaming joins the reply text, skips thoughts, and reports activity per chunk', async () => {
  const { reply, beats } = await streamed(() => sse(
    { candidates: [{ content: { parts: [{ text: 'thinking...', thought: true }] } }] },
    { candidates: [{ content: { parts: [{ text: '## Part one\n' }] } }] },
    { candidates: [{ content: { parts: [{ text: '- point' }] }, finishReason: 'STOP' }] }
  ));
  assert.equal(reply.text, '## Part one\n- point');
  assert.equal(reply.finishReason, 'STOP');
  assert.equal(beats, 3);
});

test('Gemini streaming reports a cut-off reply with its finish reason', async () => {
  const { reply } = await streamed(() => sse(
    { candidates: [{ content: { parts: [{ text: 'partial' }] }, finishReason: 'MAX_TOKENS' }] }
  ));
  assert.equal(reply.finishReason, 'MAX_TOKENS');
});

test('Gemini errors keep Google\'s own reason, before or during the stream', async () => {
  await assert.rejects(
    streamed(() => new Response(JSON.stringify({ error: { code: 503, status: 'UNAVAILABLE', message: 'The model is overloaded.' } }), { status: 503 })),
    (err) => err.code === 'provider_down' && err.status === 503 && err.message.includes('The model is overloaded.')
  );
  await assert.rejects(
    streamed(() => sse(
      { candidates: [{ content: { parts: [{ text: 'start' }] } }] },
      { error: { code: 503, status: 'UNAVAILABLE', message: 'Deadline expired.' } }
    )),
    (err) => err.code === 'provider_down' && err.message.includes('Deadline expired.')
  );
  await assert.rejects(
    streamed(() => new Response('<html>Bad gateway</html>', { status: 502 })),
    (err) => err.code === 'provider_down' && err.status === 502
  );
});
