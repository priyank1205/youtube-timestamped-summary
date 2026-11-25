// scripts/subscription-client.js
//
// Summaries through the user's Claude or ChatGPT subscription. The extension
// cannot run programs, so it asks the subscription helper (native-host/) over
// native messaging; the helper runs the Claude Code CLI or the Codex CLI that
// is signed in on this Mac. Usage counts against the subscription, not API
// credits. There is no key: the provider's stored value only records that the
// user connected it.

import { LLMClient } from './llm-client.js';
import { composeSummaryPrompt } from './constants.js';
import { apiError, ERROR_CODES } from './errors.js';

export const BRIDGE_HOST = 'com.timestamped_summary.bridge';

// The helper's failure codes, in the extension's own terms.
const CODE_MAP = {
  rate_limit: ERROR_CODES.RATE_LIMIT,
  auth: ERROR_CODES.AUTH,
  signed_out: ERROR_CODES.AUTH,
  provider_down: ERROR_CODES.PROVIDER_DOWN,
  timeout: ERROR_CODES.TIMEOUT,
  not_installed: ERROR_CODES.LOCAL_HELPER,
  cli_failed: ERROR_CODES.UNKNOWN
};

class SubscriptionClient extends LLMClient {
  constructor(providerConfig = {}) {
    super(providerConfig);
    this.providerConfig = providerConfig;
    this.cli = providerConfig.cli;
  }

  // One request over one port. `onEvent` hears every message; the promise
  // settles on the first one `settle` returns a value (or error) for.
  request(message, { signal, onEvent } = {}) {
    return new Promise((resolve, reject) => {
      const connect = globalThis.chrome?.runtime?.connectNative;
      if (typeof connect !== 'function') {
        reject(apiError(ERROR_CODES.PERMISSION,
          'The browser has not granted the extension access to the subscription helper. Connect the provider again in settings.'));
        return;
      }
      let port;
      try {
        port = connect.call(chrome.runtime, BRIDGE_HOST);
      } catch (err) {
        reject(apiError(ERROR_CODES.LOCAL_HELPER, `The subscription helper could not be started: ${err?.message || err}`));
        return;
      }
      let settled = false;
      const done = (fn, value) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener?.('abort', onAbort);
        try { port.disconnect(); } catch { /* already closed */ }
        fn(value);
      };
      const onAbort = () => done(reject, Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
      if (signal?.aborted) { onAbort(); return; }
      signal?.addEventListener?.('abort', onAbort);

      port.onMessage.addListener((msg) => {
        onEvent?.(msg);
        if (msg?.type === 'error') {
          done(reject, apiError(CODE_MAP[msg.code] || ERROR_CODES.UNKNOWN, msg.message || 'The subscription helper failed.'));
        } else if (msg?.type === 'done' || msg?.type === 'status') {
          done(resolve, msg);
        }
      });
      port.onDisconnect.addListener(() => {
        // Read lastError either way, or the browser logs it as unchecked.
        const reason = globalThis.chrome?.runtime?.lastError?.message || '';
        done(reject, apiError(ERROR_CODES.LOCAL_HELPER, /not found|forbidden/i.test(reason)
          ? 'The subscription helper is not installed for this browser. Run native-host/install.sh, then try again.'
          : `The subscription helper stopped unexpectedly${reason ? `: ${reason}` : '.'}`));
      });
      port.postMessage(message);
    });
  }

  async callAPI(_apiKey, transcript, options = {}) {
    const prompt = `${composeSummaryPrompt(options)}\n\nHere is the transcript: ${transcript}`;
    const model = options.modelId || this.providerConfig.defaultModel;
    const reply = await this.request(
      { type: 'generate', cli: this.cli, model, prompt },
      {
        signal: options.signal,
        // Every chunk and heartbeat is proof the run is alive.
        onEvent: (msg) => { if (msg?.type === 'delta' || msg?.type === 'activity') options.onActivity?.(); }
      }
    );
    return { text: reply.text || '', finishReason: reply.finishReason || null };
  }

  async status() {
    return this.request({ type: 'status', cli: this.cli });
  }

  // "Is it connected?" means: the helper answers, and the CLI is signed in.
  async validateKey(_apiKey, modelId) {
    const model = modelId || this.providerConfig.defaultModel;
    try {
      const res = await this.status();
      if (!res.ok) return { status: 'invalid', model, message: res.message };
      const models = res.models || [];
      if (models.length && !models.some((m) => m.id === model)) {
        return { status: 'model_unavailable', model, models };
      }
      return { status: 'valid', model, models };
    } catch (err) {
      return { status: 'unreachable', model, message: err?.message };
    }
  }

  async fetchModels() {
    const res = await this.status();
    if (!res.ok) throw apiError(ERROR_CODES.AUTH, res.message || 'Not signed in.');
    return res.models || [];
  }

  getModelName() {
    return this.cli;
  }
}

export { SubscriptionClient };
