// @ts-check
import { OPENROUTER_POPULAR, normalizeOpenRouterModels } from './semantic-metadata.js';

export const PROVIDER_METADATA = Object.freeze([
  Object.freeze({ name: 'gemini', label: 'Google Gemini',
    defaultModel: 'gemini-2.5-flash', defaultRunnerModel: 'gemini-2.5-flash',
    keyless: false, liveModels: false }),
]);

export const PROVIDER_MODEL_CATALOG = Object.freeze({
  gemini: Object.freeze([
    Object.freeze({ model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (fast · cheap)' }),
    Object.freeze({ model: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (reasoning · 2M)' }),
    Object.freeze({ model: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }),
    Object.freeze({ model: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }),
  ]),
});

export const LOCAL_MODEL_LABELS = Object.freeze({});

export const listProviderMetadata = () => PROVIDER_METADATA.map((provider) => ({ ...provider }));

export const providerMetadata = (name) => typeof name === 'string'
  ? PROVIDER_METADATA.find((provider) => provider.name === name) ?? null : null;

export { OPENROUTER_POPULAR, normalizeOpenRouterModels };
