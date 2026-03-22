/**
 * Server-side branding resolver.
 * Reads company branding from Supabase company_settings table.
 * Caches results in-memory with a 5-minute TTL.
 */

import { getAllSettings } from './db/settings.js';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let _cache = null;
let _cacheTime = 0;

const DEFAULTS = {
  company_name: 'RawClaw',
  logo_url: null,
  primary_color: '#014421',
  secondary_color: '#0a0a0a',
  welcome_text: 'How can I help you today?',
};

/**
 * Get branding settings. Reads from Supabase with in-memory cache.
 * Returns defaults if Supabase is not configured or query fails.
 * @returns {Promise<{company_name: string, logo_url: string|null, primary_color: string, secondary_color: string, welcome_text: string}>}
 */
export async function getBranding() {
  const now = Date.now();

  if (_cache && now - _cacheTime < CACHE_TTL) {
    return _cache;
  }

  try {
    const settings = await getAllSettings();
    _cache = {
      company_name: settings.company_name || DEFAULTS.company_name,
      logo_url: settings.logo_url || DEFAULTS.logo_url,
      primary_color: settings.primary_color || DEFAULTS.primary_color,
      secondary_color: settings.secondary_color || DEFAULTS.secondary_color,
      welcome_text: settings.welcome_text || DEFAULTS.welcome_text,
    };
  } catch {
    _cache = { ...DEFAULTS };
  }

  _cacheTime = now;
  return _cache;
}

/**
 * Invalidate the branding cache. Call after branding settings are updated.
 */
export function invalidateBrandingCache() {
  _cache = null;
  _cacheTime = 0;
}
