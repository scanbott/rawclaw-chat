/**
 * Web search availability check.
 * The Anthropic SDK handles web search natively when configured.
 * This module provides the availability flag used by render-md.js.
 */

import { getConfig } from '../config.js';

export function getProvider() {
  return getConfig('LLM_PROVIDER');
}

export function isWebSearchAvailable() {
  if (getConfig('WEB_SEARCH') === 'false') return false;
  const provider = getProvider();
  return provider === 'anthropic';
}
