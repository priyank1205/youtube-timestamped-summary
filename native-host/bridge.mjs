#!/usr/bin/env node
// native-host/bridge.mjs
//
// The subscription helper. The browser starts it on demand (native messaging)
// when the extension wants a summary from Claude, ChatGPT or Gemini, and it
// answers by running the Claude Code, Codex or Antigravity (agy) CLI that is
// already installed and signed in on this Mac. Usage counts against those
// subscriptions, never against API credits.
//
// Protocol: each message, both ways, is a 4-byte little-endian length followed
// by that many bytes of UTF-8 JSON. One port carries one request:
//
//   -> { type: 'status', cli }                    <- { type: 'status', ok, reason?, models, defaultModel }
//   -> { type: 'generate', cli, model, prompt }   <- { type: 'activity' }*  { type: 'delta', text }*
//                                                 <- { type: 'done', text, finishReason } | { type: 'error', code, message }
//
// The browser closes stdin when the extension drops the port (navigation,
// timeout, Try again); the child CLI is killed with it.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Written by install.sh: absolute paths to the CLIs, since the browser starts
// this helper with a bare PATH that finds neither.
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.join(HERE, 'bridge-config.json'), 'utf8'));
  } catch {
    return {};
  }
}
const CONFIG = loadConfig();

const SYSTEM_PROMPT = 'You turn YouTube transcripts into the timestamped summary the user message asks for. ' +
  'Answer with the summary only, in exactly the format requested. Do not run commands, read files or browse.';

// A CLI that writes nothing for this long is stuck; one that keeps writing may
// take longer, up to the ceiling.
const IDLE_LIMIT_MS = 5 * 60_000;
const CEILING_MS = 30 * 60_000;
// While the CLI runs, the extension hears from us at least this often, so its
// own "no progress" timeout never mistakes a model that is thinking for a
// stuck one. Our idle limit above is what catches a stuck one.
const HEARTBEAT_MS = 10_000;

// --- framing -----------------------------------------------------------------

export function encodeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

// Feed it chunks; it calls onMessage for every complete message.
export function createDecoder(onMessage) {
  let buffer = Buffer.alloc(0);
  return (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 4) {
      const size = buffer.readUInt32LE(0);
      if (buffer.length < 4 + size) return;
      const body = buffer.subarray(4, 4 + size).toString('utf8');
      buffer = buffer.subarray(4 + size);
      try {
        onMessage(JSON.parse(body));
      } catch {
        /* not JSON: ignore it */
      }
    }
  };
}

// --- CLIs --------------------------------------------------------------------

// Variables that would tie a nested CLI to a Claude Code session it runs inside.
function cleanEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key === 'CLAUDECODE' || key.startsWith('CLAUDE_CODE_') || key.startsWith('CLAUDE_AGENT_SDK_')) delete env[key];
  }
  return env;
}

function workDir() {
  const dir = path.join(os.tmpdir(), 'timestamped-summary-bridge');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const CODEX_CANDIDATES = [
  '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex',
  '/Applications/Codex.app/Contents/Resources/codex'
];

const AGY_CANDIDATES = [
  '/Applications/Gemini.app/Contents/Helpers/agy',
  '/Applications/Antigravity.app/Contents/Helpers/agy'
];

export function binFor(cli) {
  if (cli === 'claude') return process.env.BRIDGE_CLAUDE_BIN || CONFIG.claude || 'claude';
  if (cli === 'codex') {
    if (process.env.BRIDGE_CODEX_BIN) return process.env.BRIDGE_CODEX_BIN;
    if (CONFIG.codex) return CONFIG.codex;
    return CODEX_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || 'codex';
  }
  if (cli === 'agy') {
    if (process.env.BRIDGE_AGY_BIN) return process.env.BRIDGE_AGY_BIN;
    if (CONFIG.agy) return CONFIG.agy;
    return AGY_CANDIDATES.find((candidate) => fs.existsSync(candidate)) || 'agy';
  }
  return null;
}

// Run a short command and collect its output.
function run(bin, args, { timeoutMs = 15000, env = process.env } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child;
    try {
      child = spawn(bin, args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      const out = String(err?.message || err);
      resolve({ code: null, out, stdout: '', stderr: out });
      return;
    }
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => {
      clearTimeout(timer);
      const out = String(err?.message || err);
      resolve({ code: null, out, stdout, stderr: stderr || out });
    });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out: stdout + stderr, stdout, stderr }); });
  });
}

const CLAUDE_MODELS = [
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5' },
  { id: 'claude-fable-5-2', name: 'Claude Fable 5.2' }
];

const AGY_DEFAULT_MODEL = 'gemini-4-hydrogen-low';
const AGY_MODELS = [
  { id: 'gemini-4-hydrogen-low', name: 'Gemini 4 Hydrogen' },
  { id: 'gemini-3.8-flash-low', name: 'Gemini 3.8 Flash' }
];

// `agy models` prints tab-separated `<id>\t<Display Name>` lines to stdout
// when piped (and column-spaced lines in a terminal).
export function parseAgyModels(stdout) {
  const models = [];
  for (const raw of String(stdout || '').split(/[\r\n]+/)) {
    const line = raw.trim();
    if (!line) continue;
    const tab = line.indexOf('\t');
    if (tab > 0) {
      const id = line.slice(0, tab).trim();
      const name = line.slice(tab + 1).trim();
      if (id) models.push({ id, name: name || id });
      continue;
    }
    const spaced = line.match(/^([a-z0-9][a-z0-9._-]+)\s{2,}(.+)$/i);
    if (spaced) models.push({ id: spaced[1], name: spaced[2].trim() });
  }
  return models;
}

// Keep only the curated low-effort models and omit effort labels from display names.
export function filterAgyModels(parsed) {
  const liveIds = new Set((Array.isArray(parsed) ? parsed : []).map((m) => m?.id).filter(Boolean));
  const matched = AGY_MODELS.filter((m) => liveIds.has(m.id));
  return matched.length ? matched : AGY_MODELS;
}

function codexModels() {
  const home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  let models = [];
  let defaultModel = null;
  try {
    const cache = JSON.parse(fs.readFileSync(path.join(home, 'models_cache.json'), 'utf8'));
    const listed = Array.isArray(cache) ? cache : (cache.models || []);
    models = listed
      .filter((m) => (m.slug || m.id) && m.visibility !== 'hide')
      .map((m) => ({ id: m.slug || m.id, name: m.display_name || m.slug || m.id }));
  } catch { /* no cache: the CLI default only */ }
  try {
    const config = fs.readFileSync(path.join(home, 'config.toml'), 'utf8');
    defaultModel = config.match(/^model\s*=\s*"([^"]+)"/m)?.[1] || null;
  } catch { /* no config */ }
  return { models: [{ id: 'default', name: 'Codex default' }, ...models], defaultModel };
}

export async function status(cli) {
  const bin = binFor(cli);
  if (cli === 'claude') {
    const res = await run(bin, ['auth', 'status'], { env: cleanEnv() });
    if (res.code === null) return { ok: false, reason: 'not_installed', message: 'The Claude Code CLI was not found. Install it, then run install.sh again.' };
    let loggedIn = false;
    try { loggedIn = JSON.parse(res.out).loggedIn === true; } catch { /* not JSON */ }
    if (!loggedIn) return { ok: false, reason: 'signed_out', message: 'Claude Code is signed out. Run `claude` in a terminal and use /login.' };
    return { ok: true, models: CLAUDE_MODELS, defaultModel: 'claude-sonnet-5-5' };
  }
  if (cli === 'codex') {
    const res = await run(bin, ['login', 'status']);
    if (res.code === null) return { ok: false, reason: 'not_installed', message: 'The Codex CLI was not found. Install the ChatGPT or Codex app, then run install.sh again.' };
    if (!/logged in/i.test(res.out) || /not logged in/i.test(res.out)) {
      return { ok: false, reason: 'signed_out', message: 'Codex is signed out. Sign in from the Codex app or run `codex login`.' };
    }
    const { models } = codexModels();
    return { ok: true, models, defaultModel: 'default' };
  }
  if (cli === 'agy') {
    const res = await run(bin, ['models'], { timeoutMs: 30000 });
    if (res.code === null) {
      return {
        ok: false,
        reason: 'not_installed',
        message: 'The Gemini CLI (agy) was not found. Install the Gemini app or Antigravity CLI, then run install.sh again.'
      };
    }
    if (/please sign in|not logged in|signed out|unauthori[sz]ed|unauthenticat|authenticat/i.test(res.out)) {
      return {
        ok: false,
        reason: 'signed_out',
        message: 'Gemini is signed out. Open the Gemini app or run `agy` in a terminal to sign in.'
      };
    }
    const parsed = parseAgyModels(res.stdout);
    if (res.code !== 0 && !parsed.length) {
      const said = (res.out || `exit ${res.code}`).trim().slice(0, 300);
      return { ok: false, reason: 'cli_failed', message: `Gemini: ${said}` };
    }
    const models = filterAgyModels(parsed);
    const defaultModel = models[0]?.id || AGY_DEFAULT_MODEL;
    return { ok: true, models, defaultModel };
  }
  return { ok: false, reason: 'unknown_cli', message: `Unknown CLI "${cli}".` };
}

// What a failing CLI said, turned into a code the extension already knows.
export function classifyFailure(text) {
  const said = String(text || '');
  if (/usage limit|rate limit|limit reached|too many requests|quota|exhausted|resource_exhausted/i.test(said)) return 'rate_limit';
  if (/not logged in|log ?in|please sign in|sign ?in|signed out|unauthori[sz]ed|unauthenticat|authenticat|401/i.test(said)) return 'auth';
  if (/invalid model|not recognized as a known model|model.*not found/i.test(said)) return 'model_unavailable';
  if (/overloaded|529|503|unavailable/i.test(said)) return 'provider_down';
  return 'cli_failed';
}

// Spawn a generation. `emit` gets the protocol messages; returns a kill switch.
export function generate({ cli, model, prompt, effort }, emit) {
  const bin = binFor(cli);
  const cwd = workDir();
  let args;
  let input;
  let env = process.env;
  let outFile = null;

  if (cli === 'claude') {
    env = cleanEnv();
    args = [
      '-p',
      '--output-format', 'stream-json',
      '--verbose',
      // Streams the reply as it is written, which is also what keeps the
      // extension's progress alive during a long In-depth summary.
      '--include-partial-messages',
      '--no-session-persistence',
      '--strict-mcp-config',
      '--setting-sources', '',
      '--tools', '',
      '--system-prompt', SYSTEM_PROMPT,
      ...(effort ? ['--effort', effort] : []),
      ...(model && model !== 'default' ? ['--model', model] : [])
    ];
    input = prompt;
  } else if (cli === 'codex') {
    outFile = path.join(cwd, `codex-${process.pid}-${Date.now()}.txt`);
    args = [
      'exec',
      '--sandbox', 'read-only',
      '--skip-git-repo-check',
      '--ephemeral',
      '--color', 'never',
      '--json',
      '-C', cwd,
      '-o', outFile,
      '-c', `model_reasoning_effort="${effort || 'medium'}"`,
      ...(model && model !== 'default' ? ['-m', model] : [])
    ];
    input = `${SYSTEM_PROMPT}\n\n${prompt}`;
  } else if (cli === 'agy') {
    // Pass the prompt over stdin as stream-json so long transcripts avoid
    // command-line length limits; --sandbox and --disable-slash-commands keep
    // the run isolated from local files and workspace commands.
    args = [
      '--output-format', 'stream-json',
      '--input-format', 'stream-json',
      '--disable-slash-commands',
      '--sandbox',
      ...(effort ? ['--effort', effort] : []),
      ...(model && model !== 'default' ? ['--model', model] : []),
      '-p', ''
    ];
    input = `${JSON.stringify({ event: 'user', message: { content: `${SYSTEM_PROMPT}\n\n${prompt}` } })}\n`;
  } else {
    emit({ type: 'error', code: 'cli_failed', message: `Unknown CLI "${cli}".` });
    return () => {};
  }

  let child;
  try {
    child = spawn(bin, args, { env, cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    emit({ type: 'error', code: 'not_installed', message: `Could not start ${bin}: ${err?.message || err}` });
    return () => {};
  }

  let finished = false;
  let stdoutRest = '';
  let stderr = '';
  let text = '';
  let finalResult = null;
  let lastOutput = Date.now();
  const startedAt = Date.now();

  const finish = (message) => {
    if (finished) return;
    finished = true;
    clearInterval(heartbeat);
    // Into bridge.log (the launcher sends stderr there): how long each run took.
    const took = ((Date.now() - startedAt) / 1000).toFixed(1);
    const what = message.type === 'done' ? `${message.text.length} chars` : `${message.code}: ${String(message.message).slice(0, 160)}`;
    process.stderr.write(`  ${cli} ${model || 'default'} ${message.type} after ${took}s, ${what}\n`);
    if (outFile) fs.rmSync(outFile, { force: true });
    emit(message);
  };

  const heartbeat = setInterval(() => {
    const now = Date.now();
    if (now - lastOutput > IDLE_LIMIT_MS || now - startedAt > CEILING_MS) {
      child.kill('SIGKILL');
      finish({ type: 'error', code: 'timeout', message: `${cli} stopped responding.` });
      return;
    }
    emit({ type: 'activity' });
  }, HEARTBEAT_MS);

  const onClaudeEvent = (event) => {
    if (event?.type === 'stream_event') {
      const delta = event.event?.delta;
      if (event.event?.type === 'content_block_delta' && delta?.type === 'text_delta' && delta.text) {
        text += delta.text;
        emit({ type: 'delta', text: delta.text });
      }
    } else if (event?.type === 'result') {
      finalResult = event;
    }
  };

  const onAgyEvent = (event) => {
    if (event?.event === 'step_update') {
      const su = event.step_update;
      if (su?.step_type === 'agent_response' && typeof su.text_delta === 'string' && su.text_delta) {
        text += su.text_delta;
        emit({ type: 'delta', text: su.text_delta });
      } else {
        emit({ type: 'activity' });
      }
    } else if (event?.event === 'init') {
      emit({ type: 'activity' });
    } else if (event?.event === 'result') {
      finalResult = event.result || event;
    }
  };

  const onJsonEvent = cli === 'claude' ? onClaudeEvent : cli === 'agy' ? onAgyEvent : null;

  child.stdout.on('data', (chunk) => {
    lastOutput = Date.now();
    if (!onJsonEvent) {
      // Codex reports its steps as JSON events; the answer itself arrives in
      // the output file at the end. The events are proof of life.
      emit({ type: 'activity' });
      return;
    }
    stdoutRest += chunk;
    const lines = stdoutRest.split('\n');
    stdoutRest = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try { onJsonEvent(JSON.parse(line)); } catch { /* not an event */ }
    }
  });
  child.stderr.on('data', (chunk) => {
    lastOutput = Date.now();
    stderr = (stderr + chunk).slice(-4000);
  });
  child.on('error', (err) => {
    finish({ type: 'error', code: 'not_installed', message: `Could not start ${bin}: ${err?.message || err}` });
  });
  child.on('close', (code) => {
    if (onJsonEvent && stdoutRest.trim()) {
      try { onJsonEvent(JSON.parse(stdoutRest)); } catch { /* partial */ }
    }
    if (cli === 'claude') {
      if (finalResult?.is_error || (!finalResult && code !== 0)) {
        const said = String(finalResult?.result || stderr || `exit ${code}`).slice(0, 500);
        finish({ type: 'error', code: classifyFailure(said), message: `Claude: ${said}` });
        return;
      }
      // Without partial messages (an older CLI) the reply is only in the result.
      const reply = text || String(finalResult?.result || '');
      finish({ type: 'done', text: reply, finishReason: finalResult?.stop_reason || null });
      return;
    }
    if (cli === 'agy') {
      if (finalResult?.status === 'ERROR' || (!finalResult && code !== 0) || (code !== 0 && !text && !finalResult?.response)) {
        const said = String(finalResult?.error || stderr || `exit ${code}`).slice(0, 500);
        finish({ type: 'error', code: classifyFailure(said), message: `Gemini: ${said}` });
        return;
      }
      const reply = text || String(finalResult?.response || '');
      finish({
        type: 'done',
        text: reply,
        finishReason: finalResult?.finished_reason || finalResult?.finish_reason || null
      });
      return;
    }
    const reply = outFile && fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
    if (!reply.trim()) {
      const said = (stderr || `exit ${code}`).slice(-500);
      finish({ type: 'error', code: classifyFailure(said), message: `Codex: ${said}` });
      return;
    }
    finish({ type: 'done', text: reply, finishReason: null });
  });

  child.stdin.on('error', () => { /* the CLI closed its input early */ });
  child.stdin.end(input);

  return () => {
    if (!finished) {
      finished = true;
      clearInterval(heartbeat);
      child.kill('SIGTERM');
      if (outFile) fs.rmSync(outFile, { force: true });
    }
  };
}

// --- main --------------------------------------------------------------------

function main() {
  let stop = () => {};
  const send = (message) => {
    try { process.stdout.write(encodeMessage(message)); } catch { /* browser gone */ }
  };

  const decode = createDecoder(async (message) => {
    if (message?.type === 'status') {
      send({ type: 'status', ...(await status(message.cli)) });
    } else if (message?.type === 'generate') {
      stop = generate(message, send);
    } else {
      send({ type: 'error', code: 'cli_failed', message: `Unknown request "${message?.type}".` });
    }
  });

  process.stdin.on('data', decode);
  // The extension dropped the port: stop whatever is running and leave.
  process.stdin.on('end', () => {
    stop();
    process.exit(0);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) main();
