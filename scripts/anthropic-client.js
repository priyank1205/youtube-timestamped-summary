// scripts/anthropic-client.js

import { LLMClient } from './llm-client.js';
import CONSTANTS, { composeSummaryPrompt, outputBudgetFor } from './constants.js';
import { apiError, codeForStatus, ERROR_CODES } from './errors.js';

class AnthropicClient extends LLMClient {
  constructor(providerConfig) {
    super();
    this.providerConfig = providerConfig;
    this.endpoint = providerConfig?.endpoint || 'https://api.anthropic.com/v1/messages';
    this.modelId = providerConfig?.defaultModel || 'claude-haiku-4-5-20251001';
  }

  // Generations that still accept `temperature`.
  //
  // Anthropic deprecated `temperature`, `top_p` and `top_k` from Claude Opus
  // 4.7 on, where a non-default value is a 400 that fails the whole request.
  // This is an allow-list rather than a list of the models that reject it, so
  // that the next model released is quiet by default instead of erroring: the
  // worst an unlisted model gets is Anthropic's own sampling default, which
  // summarises perfectly well.
  static ACCEPTS_TEMPERATURE = /^claude-(3|haiku-4-5|sonnet-4-[56]|opus-4-[56])/i;

  buildBody(model, prompt, maxTokens) {
    const body = {
      model,
      // Sized from the density this run asked for: an In-depth summary of a
      // long video needs far more room than a brief one, and a reply cut off
      // mid-list is thrown away by the validator.
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };
    // Low temperature steadies the point count run-to-run, where it is taken.
    if (AnthropicClient.ACCEPTS_TEMPERATURE.test(model)) body.temperature = 0.3;
    return body;
  }

  async callAPI(apiKey, transcript, options = {}) {
    const prompt = `${composeSummaryPrompt(options)}

Here is the transcript: ${transcript}`;

    const selectedModel = options.modelId || this.modelId;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerously-allow-browser": "true"
      },
      // Carries the caller's cancellation: navigating away or superseding the
      // request stops the call instead of leaving it running to completion.
      signal: options.signal,
      body: JSON.stringify(this.buildBody(selectedModel, prompt, outputBudgetFor(options)))
    });

    const result = await response.json();
    
    if (!response.ok || result.error) {
      const status = response.status;
      let errorMsg;
      if (status === 401) errorMsg = 'Invalid API key. Please check your settings.';
      else if (status === 403) errorMsg = 'API key expired or unauthorized. Please check your settings.';
      else if (status === 429) errorMsg = 'Rate limit exceeded. Please try again later.';
      else if (status >= 500) errorMsg = `${this.getModelName()} service unavailable. Please try again later.`;
      else errorMsg = result.error?.message || `${this.getModelName()} API error: ${status}`;
      throw apiError(codeForStatus(status), errorMsg, status);
    }
    
    const text = result.content?.find?.(part => part?.type === 'text')?.text ||
      (result.content?.length > 0 ? result.content[0].text : '');
    if (text) {
      // `stop_reason` is how a summary that ran out of output budget announces
      // itself; passing it on is what stops a half-written list looking fine.
      return { text, finishReason: result.stop_reason || null };
    }
    if (result.stop_reason) return { text: '', finishReason: result.stop_reason };
    throw apiError(ERROR_CODES.BAD_OUTPUT, `Failed to get response from ${this.getModelName()}.`, response.status);
  }

  // Separates "this key is rejected" from "this key can't use that model", so a
  // model that has been retired since it was saved never reads as a bad key.
  async validateKey(apiKey, modelId) {
    const model = modelId || this.modelId;
    // A listing answers this faster, for free, and without mistaking a model
    // the key's tier cannot reach for a key that does not work. Falls through
    // to the probe below only when no list could be read.
    const listed = await this.validateByListing(apiKey, model);
    if (listed) return listed;

    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true"
        },
        body: JSON.stringify(this.buildBody(model, ".", 1))
      });
      if (res.ok) return { status: 'valid', model };
      if (res.status === 401 || res.status === 403) return { status: 'invalid', model };
      if (res.status === 404) return { status: 'model_unavailable', model };
      // A 400 naming the model is Anthropic's answer for a retired id; any
      // other 400 is a malformed request, which the key is not to blame for.
      if (res.status === 400) {
        const body = await res.json().catch(() => ({}));
        const message = String(body?.error?.message || '').toLowerCase();
        return { status: message.includes('model') ? 'model_unavailable' : 'invalid', model };
      }
      return { status: 'unreachable', model };
    } catch {
      return { status: 'unreachable', model };
    }
  }

  // Throws when the list could not be read, so an empty array always means
  // "this key really has no usable models" and callers can tell them apart.
  async fetchModels(apiKey) {
    let res;
    try {
      // `limit` matters more than it looks. The listing is ordered newest
      // first and defaults to 20 per page, and the models released since
      // Claude Haiku 4.5 already fill over half of that page. Left unset, the
      // default model would eventually fall off page one and a working key
      // would be told its own default is unavailable. 1000 is the documented
      // maximum and puts every model the key can reach in one response.
      res = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerously-allow-browser": "true"
        }
      });
    } catch (err) {
      throw apiError(ERROR_CODES.NETWORK, `Could not reach Anthropic to list models: ${err.message}`);
    }
    if (!res.ok) throw apiError(codeForStatus(res.status), `Anthropic model list failed (${res.status}).`, res.status);
    const data = await res.json().catch(() => ({}));
    if (!Array.isArray(data.data)) return [];

    // /v1/models lists text models only, so there is nothing to filter out.
    return data.data.map(m => ({
      id: m.id,
      name: m.display_name || m.id
    }));
  }

  getModelName() {
    return this.providerConfig?.name || 'Anthropic';
  }
}

export { AnthropicClient };
