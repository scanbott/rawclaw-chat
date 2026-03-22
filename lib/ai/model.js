import { getConfig } from '../config.js';

/**
 * Model configuration for rawclaw-chat.
 * Returns the resolved provider, model, and max tokens from config.
 */
export function getModelConfig() {
  return {
    provider: getConfig('LLM_PROVIDER') || 'anthropic',
    model: getConfig('LLM_MODEL') || 'claude-sonnet-4-20250514',
    maxTokens: parseInt(getConfig('LLM_MAX_TOKENS') || '4096', 10),
  };
}
