import { getSupabaseClient } from '../supabase/client.js';
import { compare } from 'bcrypt-ts';

export async function getUserByEmail(email) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();
  if (error) return null;
  return data;
}

export async function createUser({ email, passwordHash, name, role = 'member' }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .insert({ email: email.toLowerCase(), password_hash: passwordHash, name, role })
    .select()
    .single();
  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data;
}

export async function getUserCount() {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });
  if (error) return 0;
  return count;
}

export async function getUsers() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, team_id, created_at')
    .order('created_at', { ascending: false });
  if (error) return [];
  return data;
}

export async function deleteUser(id) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);
}

export async function updateUserRole(id, role) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Failed to update role: ${error.message}`);
}

export async function updateUserEmail(id, newEmail) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ email: newEmail.toLowerCase(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Failed to update email: ${error.message}`);
}

export async function updateUserPasswordById(id, newPassword) {
  const { hashSync, genSaltSync } = await import('bcrypt-ts');
  const passwordHash = hashSync(newPassword, genSaltSync(10));
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Failed to update password: ${error.message}`);
}

export async function getUserById(id) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

// First user setup -- creates admin account
export async function createFirstUser({ email, passwordHash }) {
  const count = await getUserCount();
  if (count > 0) throw new Error('Users already exist');
  return createUser({ email, passwordHash, role: 'admin' });
}

export async function verifyPassword(user, password) {
  return compare(password, user.password_hash);
}

// Backwards compat alias
export { getUsers as getAllUsers };
