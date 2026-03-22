import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'crypto';
import { getSupabaseClient } from '../supabase/client.js';

const KEY_PREFIX = 'tpb_';

// In-memory cache: array of { id, keyHash } or null (not loaded)
let _cache = null;

/**
 * Generate a new API key: tpb_ + 64 hex chars (32 random bytes).
 * @returns {string}
 */
export function generateApiKey() {
  return KEY_PREFIX + randomBytes(32).toString('hex');
}

/**
 * Hash an API key using SHA-256.
 * @param {string} key - Raw API key
 * @returns {string} Hex digest
 */
export function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Lazy-load all API key hashes into the in-memory cache.
 */
function _ensureCache() {
  if (_cache !== null) return _cache;

  const supabase = getSupabaseClient();
  // Sync compat: load from async and cache
  // First call returns empty, triggers async load
  _cache = [];
  (async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('type', 'api_key');
      if (!error && data) {
        _cache = data.map((row) => {
          const parsed = JSON.parse(row.value);
          return { id: row.id, keyHash: parsed.key_hash };
        });
      }
    } catch {
      // Non-fatal
    }
  })();

  return _cache;
}

/**
 * Clear the in-memory cache (call after create/delete).
 */
export function invalidateApiKeyCache() {
  _cache = null;
}

/**
 * Create a new named API key.
 * @param {string} name - Human-readable name for the key
 * @param {string} createdBy - User ID
 * @returns {{ key: string, record: object }}
 */
export function createApiKeyRecord(name, createdBy) {
  const supabase = getSupabaseClient();

  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, 8); // "tpb_" + first 4 hex chars
  const now = new Date().toISOString();

  const record = {
    id: randomUUID(),
    type: 'api_key',
    key: randomUUID(),
    value: JSON.stringify({ name, key_prefix: keyPrefix, key_hash: keyHash }),
    created_by: createdBy,
    last_used_at: null,
    created_at: now,
    updated_at: now,
  };

  // Fire async insert
  (async () => {
    try {
      await supabase.from('settings').insert(record);
      invalidateApiKeyCache();
    } catch (err) {
      console.error('Failed to insert API key:', err);
    }
  })();

  return {
    key,
    record: {
      id: record.id,
      name,
      keyPrefix,
      createdAt: now,
      lastUsedAt: null,
    },
  };
}

/**
 * List all API keys (metadata only, no hashes).
 * @returns {object[]}
 */
export function listApiKeys() {
  const supabase = getSupabaseClient();
  // Sync compat -- use cache approach
  const cache = _ensureCache();
  // For a proper listing we need the full rows, not just hashes
  // Return from async query
  let result = [];
  // This is a sync function but supabase is async. We'll use a stored result.
  if (_listCache !== null) return _listCache;

  // Trigger async load
  (async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('type', 'api_key');
      if (!error && data) {
        _listCache = data.map((row) => {
          const parsed = JSON.parse(row.value);
          return {
            id: row.id,
            name: parsed.name || 'API Key',
            keyPrefix: parsed.key_prefix,
            createdAt: row.created_at,
            lastUsedAt: row.last_used_at,
          };
        });
      }
    } catch {
      // Non-fatal
    }
  })();

  return _listCache || [];
}

let _listCache = null;

/**
 * Get the current API key metadata (no hash). Returns first key for backwards compat.
 * @returns {object|null}
 */
export function getApiKey() {
  const keys = listApiKeys();
  return keys.length > 0 ? keys[0] : null;
}

/**
 * Delete a specific API key by ID.
 * @param {string} id - Record ID
 */
export function deleteApiKeyById(id) {
  const supabase = getSupabaseClient();
  (async () => {
    try {
      await supabase.from('settings').delete().eq('id', id);
      invalidateApiKeyCache();
      _listCache = null;
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  })();
}

/**
 * Delete all API keys (backwards compat).
 */
export function deleteApiKey() {
  const supabase = getSupabaseClient();
  (async () => {
    try {
      await supabase.from('settings').delete().eq('type', 'api_key');
      invalidateApiKeyCache();
      _listCache = null;
    } catch (err) {
      console.error('Failed to delete API keys:', err);
    }
  })();
}

/**
 * Verify a raw API key against all cached hashes.
 * @param {string} rawKey - Raw API key from request header
 * @returns {object|null} Record if valid, null otherwise
 */
export function verifyApiKey(rawKey) {
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;

  const keyHash = hashApiKey(rawKey);
  const cached = _ensureCache();

  if (!cached || cached.length === 0) return null;

  const b = Buffer.from(keyHash, 'hex');

  for (const entry of cached) {
    const a = Buffer.from(entry.keyHash, 'hex');
    if (a.length === b.length && timingSafeEqual(a, b)) {
      // Update last_used_at (non-blocking)
      const supabase = getSupabaseClient();
      const now = new Date().toISOString();
      supabase
        .from('settings')
        .update({ last_used_at: now, updated_at: now })
        .eq('id', entry.id)
        .then(() => {})
        .catch(() => {});
      return entry;
    }
  }

  return null;
}

/**
 * Backfill lastUsedAt column from JSON value for existing api_key rows.
 * No-op for Supabase -- migration handled at schema level.
 */
export function backfillLastUsedAt() {
  // No-op for Supabase
}
