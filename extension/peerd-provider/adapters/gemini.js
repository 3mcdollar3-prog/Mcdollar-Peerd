// @ts-check
// Google Gemini adapter.
//
// Google Gemini publishes OpenAI-compatible endpoint at
// https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
// using Bearer token authentication with a Gemini API key (AIzaSy...).
// Reuses to-openai.js / from-openai.js for wire formatting and SSE parsing.

import { toOpenAiBody } from '../format/to-openai.js';
import { fromOpenAiStream } from '../format/from-openai.js';
import { abortableSleep, openInitialResponseWithRetry } from '../connect-timeout.js';
import {
  ProviderError,
  ProviderHttpError,
  ProviderUsageLimitError,
} from '../errors.js';
import { isUsageLimitResponse, apiErrorMessage } from '../error-classify.js';

const CONNECT_TIMEOUT_MS = 45_000;

export const DEFAULT_MODEL = 'gemini-2.5-flash';
export const DEFAULT_RUNNER_MODEL = 'gemini-2.5-flash';

const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60_000;

/**
 * @typedef {import('../types.js').InternalMessage} InternalMessage
 * @typedef {import('../format/from-anthropic.js').ProviderEvent} ProviderEvent
 * @typedef {import('../model-egress.js').ModelEgress} ModelEgress
 */

/**
 * Call Gemini OpenAI-compatible /chat/completions and stream events back.
 *
 * @param {Object} args
 * @param {readonly InternalMessage[]} args.messages
 * @param {string} args.system
 * @param {string} [args.model]
 * @param {number} [args.maxTokens]
 * @param {ReadonlyArray<{ name: string, description: string, schema: object }>} [args.tools]
 * @param {ModelEgress} args.modelEgress
 * @param {AbortSignal} [args.signal]
 * @param {(ms: number, signal?: AbortSignal) => Promise<void>} [args._sleep]
 * @returns {AsyncGenerator<ProviderEvent>}
 */
export async function* callGemini(args) {
  const {
    messages, system,
    model = DEFAULT_MODEL,
    maxTokens,
    tools,
    modelEgress,
    signal,
    _sleep = abortableSleep,
  } = args;

  const body = toOpenAiBody({ model, system, messages, tools, maxTokens });

  for (let attempt = 1; ; attempt++) {
    const res = await openInitialResponseWithRetry(
      (requestSignal) => modelEgress.openInference({
        providerId: 'gemini',
        modelId: model,
        nativeBody: body,
        signal: requestSignal,
      }), {
      stopSignal: signal,
      timeoutMs: CONNECT_TIMEOUT_MS,
      onTimeout: (ms) => new ProviderError('gemini', `the API did not respond within ${ms / 1000}s — it may be unreachable or down. Try again.`),
      sleepFn: _sleep,
      },
    );
    if (res.ok) {
      if (!res.body) {
        throw new ProviderError('gemini', 'response has no body (streaming requires it)');
      }
      yield* fromOpenAiStream(res.body, { provider: 'gemini' });
      return;
    }
    let bodyText = '';
    try { bodyText = await res.text(); }
    catch { bodyText = ''; }
    if (isUsageLimitResponse(res.status, bodyText)) {
      throw new ProviderUsageLimitError('gemini', {
        status: res.status,
        detail: apiErrorMessage(bodyText),
      });
    }
    const retryable = res.status === 429 || res.status === 500
      || res.status === 503 || res.status === 529;
    if (retryable && attempt <= MAX_RATE_LIMIT_RETRIES) {
      const waitMs = computeBackoffMs(res.headers, attempt);
      yield { type: 'rate-limit-pause', retryAfterMs: waitMs, attempt };
      await _sleep(waitMs, signal);
      continue;
    }
    throw new ProviderHttpError('gemini', res.status, bodyText.slice(0, 1024) || '<no body>');
  }
}

/**
 * @param {Headers} headers
 * @param {number} attempt   1-indexed
 * @returns {number}         milliseconds to wait, clamped to MAX_BACKOFF_MS
 */
const computeBackoffMs = (headers, attempt) => {
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs) && secs >= 0) {
      return Math.min(secs * 1000 + 250, MAX_BACKOFF_MS);
    }
  }
  return Math.min(DEFAULT_BACKOFF_MS * (2 ** (attempt - 1)), MAX_BACKOFF_MS);
};

export const _computeBackoffMsForTests = computeBackoffMs;

export const geminiAdapter = Object.freeze({
  name: 'gemini',
  label: 'Google Gemini',
  defaultModel: DEFAULT_MODEL,
  defaultRunnerModel: DEFAULT_RUNNER_MODEL,
  call: callGemini,
});
