import { getSupabaseClient } from '../supabase/client.js';

export async function getChats(userId, limit = 50) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data;
}

export async function getChatById(chatId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();
  if (error) return null;
  return data;
}

export async function createChat({ id, userId, title = 'New Chat' }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chats')
    .insert({ id, user_id: userId, title })
    .select()
    .single();
  if (error) throw new Error(`Failed to create chat: ${error.message}`);
  return data;
}

export async function deleteChat(chatId, userId) {
  const supabase = getSupabaseClient();
  // Delete messages first
  await supabase.from('messages').delete().eq('chat_id', chatId);
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to delete chat: ${error.message}`);
}

export async function renameChat(chatId, userId, title) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('chats')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to rename chat: ${error.message}`);
}

export async function starChat(chatId, userId, starred) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('chats')
    .update({ starred, updated_at: new Date().toISOString() })
    .eq('id', chatId)
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to star chat: ${error.message}`);
}

export async function toggleChatStarred(chatId) {
  const supabase = getSupabaseClient();
  const { data: chat } = await supabase
    .from('chats')
    .select('starred')
    .eq('id', chatId)
    .single();
  const newValue = chat?.starred ? false : true;
  await supabase
    .from('chats')
    .update({ starred: newValue, updated_at: new Date().toISOString() })
    .eq('id', chatId);
  return newValue;
}

export async function updateChatTitle(chatId, title) {
  const supabase = getSupabaseClient();
  await supabase
    .from('chats')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', chatId);
}

export async function deleteAllChatsByUser(userId) {
  const supabase = getSupabaseClient();
  // Get all chat IDs for user
  const { data: userChats } = await supabase
    .from('chats')
    .select('id')
    .eq('user_id', userId);
  if (userChats && userChats.length > 0) {
    const chatIds = userChats.map(c => c.id);
    await supabase.from('messages').delete().in('chat_id', chatIds);
  }
  await supabase.from('chats').delete().eq('user_id', userId);
}

// Messages

export async function getMessages(chatId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) return [];
  return data;
}

export async function getMessagesByChatId(chatId) {
  return getMessages(chatId);
}

export async function saveMessage({ chatId, role, content, metadata = {} }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, role, content, metadata })
    .select()
    .single();
  if (error) throw new Error(`Failed to save message: ${error.message}`);
  // Update chat's updated_at
  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);
  return data;
}

// Backwards compat: old signature was saveMessage(chatId, role, content, id)
export async function saveMessageCompat(chatId, role, content, id = null) {
  const insert = { chat_id: chatId, role, content };
  if (id) insert.id = id;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('messages')
    .insert(insert)
    .select()
    .single();
  if (error) throw new Error(`Failed to save message: ${error.message}`);
  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId);
  return data;
}

// Get chats for a team (manager view)
export async function getTeamChats(teamId, limit = 50) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chats')
    .select('*, users!inner(name, email, team_id)')
    .eq('users.team_id', teamId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data;
}

// Workspace linking (may not be used with Supabase, kept for compat)
export async function getChatByWorkspaceId(workspaceId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('code_workspace_id', workspaceId)
    .single();
  if (error) return null;
  return data;
}

export async function linkChatToWorkspace(chatId, workspaceId) {
  const supabase = getSupabaseClient();
  await supabase
    .from('chats')
    .update({ code_workspace_id: workspaceId, updated_at: new Date().toISOString() })
    .eq('id', chatId);
}
