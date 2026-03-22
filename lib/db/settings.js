import { getSupabaseClient } from '../supabase/client.js';

export async function getSetting(key) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('company_settings')
    .select('value')
    .eq('key', key)
    .single();
  if (error) return null;
  return data.value;
}

export async function setSetting(key, value) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('company_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to set setting: ${error.message}`);
}

export async function getAllSettings() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('company_settings')
    .select('*');
  if (error) return {};
  return Object.fromEntries(data.map(({ key, value }) => [key, value]));
}
