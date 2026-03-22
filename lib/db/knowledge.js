import { getSupabaseClient } from '../supabase/client.js';

export async function getKnowledgeDocs({ category, status, limit = 100 } = {}) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('knowledge_docs')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (status) query = query.eq('status', status);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return [];
  return data;
}

export async function searchKnowledge(query, limit = 10) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('knowledge_docs')
    .select('*')
    .eq('status', 'approved')
    .textSearch('content', query, { type: 'websearch' })
    .limit(limit);
  if (error) return [];
  return data;
}

export async function getKnowledgeDoc(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('knowledge_docs')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function createKnowledgeDoc({ title, content, category, subcategory, tags, source = 'manual', status = 'approved', createdBy }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('knowledge_docs')
    .insert({ title, content, category, subcategory, tags, source, status, created_by: createdBy })
    .select()
    .single();
  if (error) throw new Error(`Failed to create doc: ${error.message}`);
  return data;
}

export async function updateKnowledgeDoc(id, updates) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('knowledge_docs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Failed to update doc: ${error.message}`);
}

export async function deleteKnowledgeDoc(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('knowledge_docs').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete doc: ${error.message}`);
}
