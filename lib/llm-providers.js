/**
 * Built-in LLM provider definitions.
 * Each provider declares its credentials and available models.
 * Imported by config resolver, server actions, and UI.
 */

// Model capability flags:
//   chat:        works with the chat agent
//   codingAgent: works with coding agents (Claude Code CLI, Pi CLI)
// Omitted flags default to true for backward compat.

export const BUILTIN_PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    credentials: [
      { type: 'api_key', key: 'ANTHROPIC_API_KEY', label: 'API Key' },
    ],
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', default: true },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
      { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
    ],
  },
  openai: {
    name: 'OpenAI',
    credentials: [
      { type: 'api_key', key: 'OPENAI_API_KEY', label: 'API Key' },
    ],
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1', default: true },
      { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano' },
      { id: 'o3', name: 'o3' },
      { id: 'o4-mini', name: 'o4-mini' },
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    ],
  },
  google: {
    name: 'Google',
    credentials: [
      { type: 'api_key', key: 'GOOGLE_API_KEY', label: 'API Key' },
    ],
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', default: true },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', chat: false },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', chat: false },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', chat: false },
    ],
  },
  deepseek: {
    name: 'DeepSeek',
    credentials: [
      { type: 'api_key', key: 'DEEPSEEK_API_KEY', label: 'API Key' },
    ],
    anthropicEndpoint: 'https://api.deepseek.com/anthropic',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', default: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', chat: false },
    ],
  },
  minimax: {
    name: 'MiniMax',
    credentials: [
      { type: 'api_key', key: 'MINIMAX_API_KEY', label: 'API Key' },
    ],
    anthropicEndpoint: 'https://api.minimax.io/anthropic',
    models: [
      { id: 'MiniMax-M2.7', name: 'MiniMax M2.7', default: true },
      { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax M2.7 Highspeed' },
      { id: 'MiniMax-M2.5', name: 'MiniMax M2.5' },
      { id: 'MiniMax-M2.5-highspeed', name: 'MiniMax M2.5 Highspeed' },
    ],
  },
  mistral: {
    name: 'Mistral',
    credentials: [
      { type: 'api_key', key: 'MISTRAL_API_KEY', label: 'API Key' },
    ],
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', default: true },
      { id: 'mistral-medium-latest', name: 'Mistral Medium' },
      { id: 'mistral-small-latest', name: 'Mistral Small' },
      { id: 'codestral-latest', name: 'Codestral' },
      { id: 'devstral-small-latest', name: 'Devstral Small', chat: false },
    ],
  },
  xai: {
    name: 'xAI',
    credentials: [
      { type: 'api_key', key: 'XAI_API_KEY', label: 'API Key' },
    ],
    models: [
      { id: 'grok-3', name: 'Grok 3', default: true },
      { id: 'grok-3-mini', name: 'Grok 3 Mini' },
      { id: 'grok-3-fast', name: 'Grok 3 Fast' },
      { id: 'grok-2', name: 'Grok 2' },
    ],
  },
  openrouter: {
    name: 'OpenRouter',
    credentials: [
      { type: 'api_key', key: 'OPENROUTER_API_KEY', label: 'API Key' },
    ],
    models: [],
  },
};

/**
 * Get the default model ID for a built-in provider.
 * @param {string} providerSlug
 * @returns {string|undefined}
 */
export function getDefaultModel(providerSlug) {
  const provider = BUILTIN_PROVIDERS[providerSlug];
  if (!provider) return undefined;
  const defaultModel = provider.models.find((m) => m.default);
  return defaultModel?.id || provider.models[0]?.id;
}

/**
 * Get all credential keys across all built-in providers.
 * @returns {string[]}
 */
export function getAllCredentialKeys() {
  const keys = [];
  for (const provider of Object.values(BUILTIN_PROVIDERS)) {
    for (const cred of provider.credentials) {
      keys.push(cred.key);
    }
  }
  return keys;
}
