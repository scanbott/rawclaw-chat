import { randomUUID } from 'crypto';
import { getSupabaseClient } from '../supabase/client.js';
import { getConfig } from '../config.js';

/**
 * Create a notification, then distribute to all subscribers.
 * @param {string} notificationText - Human-readable notification text
 * @param {object} payload - Raw webhook payload
 * @returns {object} The created notification
 */
export async function createNotification(notificationText, payload) {
  const supabase = getSupabaseClient();
  const row = {
    id: randomUUID(),
    notification: notificationText,
    payload: JSON.stringify(payload),
    read: false,
  };
  await supabase.from('notifications').insert(row);

  // Distribute to subscribers (fire-and-forget)
  distributeNotification(notificationText).catch((err) => {
    console.error('Failed to distribute notification:', err);
  });

  return row;
}

/**
 * Get notifications, newest first, with pagination.
 * @param {number} limit - Max rows to return
 * @param {number} offset - Rows to skip
 * @returns {object[]}
 */
export async function getNotifications(limit = 25, offset = 0) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);
  if (error) return [];
  return data || [];
}

/**
 * Get count of unread notifications.
 * @returns {number}
 */
export async function getUnreadCount() {
  const supabase = getSupabaseClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);
  if (error) return 0;
  return count || 0;
}

/**
 * Mark all notifications as read.
 */
export async function markAllRead() {
  const supabase = getSupabaseClient();
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('read', false);
}

/**
 * Get all subscriptions.
 * @returns {object[]}
 */
export async function getSubscriptions() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('subscriptions').select('*');
  if (error) return [];
  return data || [];
}

/**
 * Distribute a notification to all subscribers.
 * @param {string} notificationText - The notification message
 */
async function distributeNotification(notificationText) {
  const subs = await getSubscriptions();
  if (!subs.length) return;

  for (const sub of subs) {
    try {
      if (sub.platform === 'telegram') {
        const botToken = getConfig('TELEGRAM_BOT_TOKEN');
        if (!botToken) continue;
        const { sendMessage } = await import('../tools/telegram.js');
        await sendMessage(botToken, sub.channel_id, notificationText);
      }
    } catch (err) {
      console.error(`Failed to send to ${sub.platform}/${sub.channel_id}:`, err);
    }
  }
}
