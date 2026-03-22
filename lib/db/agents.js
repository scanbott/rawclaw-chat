import { getSupabaseClient } from '../supabase/client.js';

export async function createAgentLog({ agentId, userId, chatId, prompt, status = 'running', metadata = {} }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agent_logs')
    .insert({ agent_id: agentId, user_id: userId, chat_id: chatId, prompt, status, metadata })
    .select()
    .single();
  if (error) throw new Error(`Failed to create agent log: ${error.message}`);
  return data;
}

export async function updateAgentLog(id, { status, result, metadata }) {
  const supabase = getSupabaseClient();
  const updates = { status };
  if (result !== undefined) updates.result = result;
  if (metadata !== undefined) updates.metadata = metadata;
  if (status === 'completed' || status === 'failed' || status === 'stopped') {
    updates.completed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from('agent_logs')
    .update(updates)
    .eq('id', id);
  if (error) throw new Error(`Failed to update agent log: ${error.message}`);
}

export async function getAgentLogs(userId, limit = 50) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data;
}
