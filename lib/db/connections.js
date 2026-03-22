import { getSupabaseClient } from '../supabase/client.js';

export async function getUserConnections(userId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_connections')
    .select('id, provider, metadata, created_at')
    .eq('user_id', userId);
  if (error) return [];
  return data;
}

export async function getConnection(userId, provider) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();
  if (error) return null;
  return data;
}

export async function upsertConnection({ userId, provider, accessToken, refreshToken, tokenExpiresAt, metadata = {} }) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_connections')
    .upsert({
      user_id: userId,
      provider,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: tokenExpiresAt,
      metadata,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,provider' });
  if (error) throw new Error(`Failed to upsert connection: ${error.message}`);
}

export async function deleteConnection(userId, provider) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_connections')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);
  if (error) throw new Error(`Failed to delete connection: ${error.message}`);
}
