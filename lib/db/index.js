import { getSupabaseClient } from '../supabase/client.js';

// Re-export for backwards compatibility with existing code
export function getDb() {
  return getSupabaseClient();
}

// No-op -- Supabase doesn't need local initialization
export function initDatabase() {
  // Supabase is initialized via the client singleton
  // Schema is managed via supabase/migrations/
}
