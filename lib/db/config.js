import { randomUUID } from 'crypto';
import { getSupabaseClient } from '../supabase/client.js';
import { encrypt, decrypt } from './crypto.js';
import { createOAuthToken } from './oauth-tokens.js';

// -----------------------------------------------------------------------
// Plain config (type: 'config')
// -----------------------------------------------------------------------

/**
 * Get a plain config value.
 * @param {string} key
 * @returns {string|null}
 */
export function getConfigValue(key) {
  // Sync wrapper -- uses the cached supabase client
  // For backwards compat, this remains sync by doing a blocking query
  // In practice, callers should migrate to async over time
  const supabase = getSupabaseClient();
  // Supabase JS client is async-only, so we return a promise-like
  // For sync compat, we use a workaround with a sync cache
  return _syncGetSetting('config', key);
}

/**
 * Set a plain config value (upsert: delete + insert).
 * @param {string} key
 * @param {string} value
 * @param {string} [userId]
 */
export function setConfigValue(key, value, userId) {
  _syncUpsertSetting('config', key, JSON.stringify(value), userId);
}

/**
 * Delete a plain config value.
 * @param {string} key
 */
export function deleteConfigValue(key) {
  _syncDeleteSetting('config', key);
}

// -----------------------------------------------------------------------
// Encrypted secrets (type: 'config_secret')
// -----------------------------------------------------------------------

/**
 * Get a decrypted secret value.
 * @param {string} key
 * @returns {string|null}
 */
export function getConfigSecret(key) {
  const raw = _syncGetSetting('config_secret', key);
  if (!raw) return null;
  try {
    return decrypt(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Set an encrypted secret (upsert: delete + insert).
 * @param {string} key
 * @param {string} value - Plaintext value to encrypt
 * @param {string} [userId]
 */
export function setConfigSecret(key, value, userId) {
  const encrypted = encrypt(value);
  _syncUpsertSetting('config_secret', key, JSON.stringify(encrypted), userId);
}

/**
 * Delete an encrypted secret.
 * @param {string} key
 */
export function deleteConfigSecret(key) {
  _syncDeleteSetting('config_secret', key);
}

/**
 * Get status (set/not-set + updatedAt) for multiple secret keys. Never returns values.
 * @param {string[]} keys
 * @returns {{ key: string, isSet: boolean, updatedAt: number|null }[]}
 */
export function getSecretStatus(keys) {
  const supabase = getSupabaseClient();
  // This needs to be sync for compat -- use the settings cache
  const cache = _ensureSettingsCache();
  return keys.map((key) => {
    const entry = cache.find(r => r.type === 'config_secret' && r.key === key);
    return {
      key,
      isSet: !!entry,
      updatedAt: entry?.updated_at ? new Date(entry.updated_at).getTime() : null,
    };
  });
}

// -----------------------------------------------------------------------
// Custom LLM providers (type: 'llm_provider')
// -----------------------------------------------------------------------

/**
 * Get all custom providers (API keys masked for UI).
 * @returns {{ key: string, name: string, baseUrl: string, model: string, hasApiKey: boolean }[]}
 */
export function getCustomProviders() {
  const cache = _ensureSettingsCache();
  const rows = cache.filter(r => r.type === 'llm_provider');
  return rows.map((row) => {
    const config = JSON.parse(decrypt(JSON.parse(row.value)));
    return {
      key: row.key,
      name: config.name,
      baseUrl: config.baseUrl,
      model: config.model,
      hasApiKey: !!config.apiKey,
    };
  });
}

/**
 * Get a single custom provider with full (unmasked) API key -- for runtime use.
 * @param {string} key
 * @returns {{ name: string, baseUrl: string, apiKey: string, model: string }|null}
 */
export function getCustomProvider(key) {
  const raw = _syncGetSetting('llm_provider', key);
  if (!raw) return null;
  return JSON.parse(decrypt(JSON.parse(raw)));
}

/**
 * Create or update a custom provider (encrypted JSON).
 * @param {string} key - Slug identifier (e.g. 'together-ai')
 * @param {{ name: string, baseUrl: string, apiKey?: string, model: string }} config
 * @param {string} [userId]
 */
export function setCustomProvider(key, config, userId) {
  const encrypted = encrypt(JSON.stringify(config));
  _syncUpsertSetting('llm_provider', key, JSON.stringify(encrypted), userId);
}

/**
 * Delete a custom provider.
 * @param {string} key
 */
export function deleteCustomProvider(key) {
  _syncDeleteSetting('llm_provider', key);
}

// -----------------------------------------------------------------------
// Migration: import env vars to DB on first run
// -----------------------------------------------------------------------

// Secrets to migrate from process.env -> config_secret
const MIGRATE_SECRETS = [
  'GH_TOKEN',
  'GH_WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'CLAUDE_CODE_OAUTH_TOKEN',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
];

// Plain config to migrate from process.env -> config
const MIGRATE_CONFIG = [
  'LLM_PROVIDER',
  'LLM_MODEL',
  'LLM_MAX_TOKENS',
  'WEB_SEARCH',
  'AGENT_BACKEND',
  'OPENAI_BASE_URL',
  'TELEGRAM_CHAT_ID',
];

/**
 * One-time migration: import env vars into DB if no config entries exist yet.
 * Idempotent -- checks for any existing config/config_secret rows first.
 */
export function migrateEnvToDb() {
  const cache = _ensureSettingsCache();
  const hasConfig = cache.some(r => r.type === 'config');
  const hasSecret = cache.some(r => r.type === 'config_secret');

  if (hasConfig || hasSecret) return; // Already migrated

  let migrated = 0;

  for (const key of MIGRATE_SECRETS) {
    const value = process.env[key];
    if (value) {
      if (key === 'CLAUDE_CODE_OAUTH_TOKEN') {
        createOAuthToken('claudeCode', 'OAuth Token', value, 'migration');
      } else {
        setConfigSecret(key, value, 'migration');
      }
      migrated++;
    }
  }

  for (const key of MIGRATE_CONFIG) {
    const value = process.env[key];
    if (value) {
      setConfigValue(key, value, 'migration');
      migrated++;
    }
  }

  // Migrate custom provider from OPENAI_BASE_URL + CUSTOM_API_KEY
  if (process.env.LLM_PROVIDER === 'custom' && process.env.OPENAI_BASE_URL) {
    setCustomProvider('custom', {
      name: 'Custom',
      baseUrl: process.env.OPENAI_BASE_URL,
      apiKey: process.env.CUSTOM_API_KEY || '',
      model: process.env.LLM_MODEL || '',
    }, 'migration');
    migrated++;
  }

  if (migrated > 0) {
    console.log(`Migrated ${migrated} config values from .env to database`);
  }
}

// -----------------------------------------------------------------------
// Internal sync helpers using in-memory cache
// The settings table is small enough to cache entirely in memory.
// Cache is refreshed on writes and on first access.
// -----------------------------------------------------------------------

let _settingsCache = null;
let _settingsCacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

function _ensureSettingsCache() {
  const now = Date.now();
  if (_settingsCache && (now - _settingsCacheTime) < CACHE_TTL) {
    return _settingsCache;
  }
  // Load synchronously via a blocking fetch is not possible with Supabase JS.
  // Instead, we maintain the cache and refresh it asynchronously.
  // On first call, return empty and trigger async load.
  if (!_settingsCache) {
    _settingsCache = [];
    _refreshCacheAsync();
  }
  return _settingsCache;
}

async function _refreshCacheAsync() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('settings').select('*');
    if (!error && data) {
      _settingsCache = data;
      _settingsCacheTime = Date.now();
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Invalidate the settings cache (call after writes).
 */
export function invalidateSettingsCache() {
  _settingsCache = null;
  _settingsCacheTime = 0;
}

function _syncGetSetting(type, key) {
  const cache = _ensureSettingsCache();
  const row = cache.find(r => r.type === type && r.key === key);
  if (!row) return null;
  return type === 'config' ? JSON.parse(row.value) : row.value;
}

function _syncUpsertSetting(type, key, value, userId) {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // Fire async upsert (delete + insert for compat with unique constraints)
  (async () => {
    try {
      await supabase
        .from('settings')
        .delete()
        .eq('type', type)
        .eq('key', key);

      await supabase
        .from('settings')
        .insert({
          id: randomUUID(),
          type,
          key,
          value,
          created_by: userId || null,
          created_at: now,
          updated_at: now,
        });

      invalidateSettingsCache();
      await _refreshCacheAsync();
    } catch (err) {
      console.error(`Failed to upsert setting ${type}/${key}:`, err);
    }
  })();

  // Update local cache immediately for sync reads
  if (_settingsCache) {
    _settingsCache = _settingsCache.filter(r => !(r.type === type && r.key === key));
    _settingsCache.push({
      id: randomUUID(),
      type,
      key,
      value,
      created_by: userId || null,
      created_at: now,
      updated_at: now,
    });
  }
}

function _syncDeleteSetting(type, key) {
  const supabase = getSupabaseClient();

  (async () => {
    try {
      await supabase
        .from('settings')
        .delete()
        .eq('type', type)
        .eq('key', key);
      invalidateSettingsCache();
      await _refreshCacheAsync();
    } catch (err) {
      console.error(`Failed to delete setting ${type}/${key}:`, err);
    }
  })();

  // Update local cache immediately
  if (_settingsCache) {
    _settingsCache = _settingsCache.filter(r => !(r.type === type && r.key === key));
  }
}
