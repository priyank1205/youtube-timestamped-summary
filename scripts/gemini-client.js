// scripts/gemini-client.js

import { LLMClient } from './llm-client.js';

// Import constants + the prompt composer
import CONSTANTS, { composeSummaryPrompt, outputBudgetFor } from './constants.js';
import { apiError, codeForStatus, ERROR_CODES } from './errors.js';

// The panel's copy is the category's; Google's own words ("The model is
// overloaded", "Deadline expired", ...) go into Copy details, since they are
// what tell a busy model from a request that is too slow for it.
function geminiError(status, error) {
  let message;
  if (status === 400) message = 'Invalid API key. Please check your settings.';
  else if (status === 403) message = 'API key expired or unauthorized. Please check your settings.';
  else if (status === 429) message = 'Rate limit exceeded. Please try again later.';
  else if (status >= 500) message = 'Gemini service unavailable. Please try again later.';
  else message = error?.message || `Gemini API error: ${status}`;
  const said = [error?.status, error?.message].filter(Boolean).join(': ');
  if (said && !message.includes(said)) message = `${message} (${said})`;
  return apiError(codeForStatus(status), message, status);
}

// Server-sent events from streamGenerateContent?alt=sse: one JSON object per
// `data:` line. A response without a readable body (a test double) is read
// as a single JSON reply so the same loop handles both.
async function* readEvents(response) {
  if (!response.body?.getReader) {
    const body = await response.json().catch(() => ({}));
    for (const event of Array.isArray(body) ? body : [body]) yield event;
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const parse = (line) => {
    const data = line.startsWith('data:') ? line.slice(5).trim() : '';
    if (!data || data === '[DONE]') return null;
    try { return JSON.parse(data); } catch { return null; }
  };
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = done ? '' : lines.pop();
    for (const line of lines) {
      const event = parse(line);
      if (event) yield event;
    }
    if (done) return;
  }
}

class GeminiClient extends LLMClient {
  constructor(providerConfig = {}) {
    super(providerConfig);
    this.providerConfig = providerConfig;
  }

  // Function to call Gemini API
  async callGeminiAPI(apiKey, transcript, options = {}) {
    const prompt = `${composeSummaryPrompt(options)}

Here is the transcript: ${transcript}`;

    const modelId = options.modelId || this.providerConfig?.defaultModel || 'gemini-flash-lite-latest';
    // Streamed, not one long wait. A big or thinking model can spend minutes on
    // an In-depth summary of a long video, and Google ends a single silent
    // request that runs too long with a 503 after it has already read (and
    // billed) the whole transcript. A stream keeps the connection busy and
    // tells the panel the run is alive while the model works.
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent`;
    const maxOutputTokens = await this.outputTokensFor(apiKey, modelId, outputBudgetFor(options), options.signal);
    const response = await fetch(`${API_ENDPOINT}?alt=sse&key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Carries the caller's cancellation: navigating away or superseding the
      // request stops the call instead of leaving it running to completion.
      signal: options.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // An output budget sized from the density this run asked for, so long
        // In-depth summaries aren't truncated mid-list; low temperature
        // steadies the point count run-to-run.
        generationConfig: { maxOutputTokens, temperature: 0.3 }
      })
    });

    if (!response.ok) {
      // A gateway error can arrive as an HTML page, not JSON; reading it must
      // not replace the real status with a parse error.
      const body = await response.json().catch(() => ({}));
      throw geminiError(response.status, (Array.isArray(body) ? body[0] : body)?.error);
    }

    let text = '';
    let finishReason = null;
    let blockReason = null;
    for await (const event of readEvents(response)) {
      // Google can still fail a request after the stream has started.
      if (event.error) throw geminiError(Number(event.error.code) || 500, event.error);
      const candidate = event.candidates?.[0];
      for (const part of candidate?.content?.parts || []) {
        // Thought summaries are only sent when asked for; never join one in.
        if (part.thought) continue;
        if (typeof part.text === 'string') text += part.text;
      }
      if (candidate?.finishReason) finishReason = candidate.finishReason;
      if (event.promptFeedback?.blockReason) blockReason = event.promptFeedback.blockReason;
      options.onActivity?.();
    }

    // The reason the model stopped travels with the reply. Reporting it is
    // what turns a silently half-written summary into a named failure.
    if (text) return { text, finishReason };
    // No text and a stop reason means the response was cut short or refused;
    // the validator turns that reason into the category the panel shows.
    if (finishReason || blockReason) return { text: '', finishReason: finishReason || blockReason };
    throw apiError(ERROR_CODES.BAD_OUTPUT, "Failed to get response from Gemini.", response.status);
  }

  // A thinking model spends its reasoning out of the same maxOutputTokens as
  // the reply. Sized only for the summary, a model that thinks hard (Gemini 4
  // Hydrogen does) uses up the budget before the last chapter and the run
  // fails as cut off. Such models get room to think on top of the summary's
  // budget, never past the model's own output limit. Anything this can't learn
  // keeps the summary's budget, exactly as before.
  async outputTokensFor(apiKey, modelId, budget, signal) {
    const info = await this.modelInfo(apiKey, modelId, signal);
    if (!info?.thinking) return budget;
    const wanted = budget + GeminiClient.THINKING_HEADROOM;
    const limit = Number(info.outputTokenLimit);
    return Number.isFinite(limit) && limit > 0 ? Math.max(budget, Math.min(wanted, limit)) : wanted;
  }

  // One lookup per model per service-worker lifetime; a failed lookup is not
  // cached, so the next run asks again.
  async modelInfo(apiKey, modelId, signal) {
    const cache = GeminiClient.modelInfoCache;
    if (cache.has(modelId)) return cache.get(modelId);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}?key=${encodeURIComponent(apiKey)}`,
        { signal }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const info = { thinking: data?.thinking === true, outputTokenLimit: data?.outputTokenLimit ?? null };
      cache.set(modelId, info);
      return info;
    } catch {
      return null;
    }
  }

  // Implement LLMClient interface methods
  async callAPI(apiKey, transcript, options = {}) {
    return this.callGeminiAPI(apiKey, transcript, options);
  }

  // Separates "this key is rejected" from "this key can't use that model", so a
  // model that has been retired since it was saved never reads as a bad key.
  async validateKey(apiKey, modelId) {
    const model = modelId || this.providerConfig?.defaultModel || 'gemini-flash-lite-latest';
    // A listing answers this faster, for free, and without mistaking a model
    // the key's tier cannot reach for a key that does not work. Falls through
    // to the probe below only when no list could be read.
    const listed = await this.validateByListing(apiKey, model);
    if (listed) return listed;

    try {
      const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const res = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "." }] }] })
      });
      if (res.ok) return { status: 'valid', model };
      const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (modelsRes.ok) return { status: 'model_unavailable', model };
      return { status: 'invalid', model };
    } catch {
      return { status: 'unreachable', model };
    }
  }

  // Throws when the list could not be read, so an empty array always means
  // "this key really has no usable models" and callers can tell them apart.
  async fetchModels(apiKey) {
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    } catch (err) {
      throw apiError(ERROR_CODES.NETWORK, `Could not reach Gemini to list models: ${err.message}`);
    }
    if (!res.ok) throw apiError(codeForStatus(res.status), `Gemini model list failed (${res.status}).`, res.status);
    const data = await res.json().catch(() => ({}));
    // Only models that can answer a generateContent call belong in the picker.
    const models = (Array.isArray(data.models) ? data.models : [])
      .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', '')
      }));

    // Ensure "Gemini Flash-Lite Latest" (gemini-flash-lite-latest) is present and prioritized at the top
    const flashLiteIndex = models.findIndex(m => m.id === 'gemini-flash-lite-latest' || m.name === 'Gemini Flash-Lite Latest');
    if (flashLiteIndex >= 0) {
      const [item] = models.splice(flashLiteIndex, 1);
      item.name = item.name || 'Gemini Flash-Lite Latest';
      models.unshift(item);
    } else {
      models.unshift({
        id: 'gemini-flash-lite-latest',
        name: 'Gemini Flash-Lite Latest'
      });
    }

    return models;
  }

  getModelName() {
    return 'gemini';
  }
}

GeminiClient.THINKING_HEADROOM = 16384;
GeminiClient.modelInfoCache = new Map();

export { GeminiClient };