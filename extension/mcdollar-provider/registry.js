// @ts-check
// Provider registry.
// Only Google Gemini enabled for Mcdollar.

import { geminiAdapter } from './adapters/gemini.js';
import { asWindow } from './model-window.js';
import { UnknownProviderError } from './errors.js';

/** @typedef {import('./types.js').InternalMessage} InternalMessage */
/** @typedef {import('./format/from-anthropic.js').ProviderEvent} ProviderEvent */

const adapters = new Map();
adapters.set(geminiAdapter.name, geminiAdapter);

export const registerProvider = (adapter) => {
  if (adapters.has(adapter.name)) return false;
  adapters.set(adapter.name, adapter);
  return true;
};

export const unregisterProvider = (name) => adapters.delete(name);
export const getProvider = (name) => adapters.get(name) ?? null;

export const listProviders = () =>
  [...adapters.values()].map((a) => ({
    name: a.name,
    label: a.label,
    defaultModel: a.defaultModel,
    defaultRunnerModel: a.defaultRunnerModel ?? a.defaultModel,
    keyless: !!a.keyless,
    liveModels: typeof a.listModels === 'function',
  }));

export const listProviderModels = async (name, deps) => {
  const adapter = adapters.get(name);
  if (!adapter) throw new UnknownProviderError(name);
  if (typeof adapter.listModels !== 'function') return null;
  return adapter.listModels(deps);
};

export const providerModelContextWindow = async (name, model, deps) => {
  const adapter = adapters.get(name);
  if (!adapter || typeof adapter.contextWindow !== 'function') return null;
  try {
    return asWindow(await adapter.contextWindow({ model, ...deps }));
  } catch {
    return null;
  }
};

export const callModel = (args) => {
  const adapter = adapters.get(args.provider);
  if (!adapter) throw new UnknownProviderError(args.provider);
  return adapter.call(args);
};
