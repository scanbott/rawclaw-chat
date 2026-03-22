import { callClaude } from './agent.js';
import { getChatById, createChat, saveMessageCompat, updateChatTitle } from '../db/chats.js';
import { buildSystemPrompt } from './knowledge-context.js';
import { searchKnowledge } from '../db/knowledge.js';

/**
 * Ensure a chat exists in the DB and save a message.
 *
 * @param {string} threadId - Chat/thread ID
 * @param {string} role - 'user' or 'assistant'
 * @param {string} text - Message text
 * @param {object} [options] - { userId, chatTitle }
 */
async function persistMessage(threadId, role, text, options = {}) {
  try {
    const existing = await getChatById(threadId);
    if (!existing) {
      await createChat({ id: threadId, userId: options.userId || 'unknown', title: options.chatTitle || 'New Chat' });
    }
    await saveMessageCompat(threadId, role, text);
  } catch (err) {
    console.error(`[persistMessage] Failed to save ${role} message to chat ${threadId} (${text?.length ?? 0} chars):`, err);
  }
}

/**
 * Build conversation context from previous messages.
 * Formats chat history into a single string that gets prepended to the user message.
 *
 * @param {Array} messages - Array of {role, content} from DB
 * @returns {string}
 */
function formatConversationHistory(messages) {
  if (!messages || messages.length === 0) return '';

  const lines = messages.map((m) => {
    const label = m.role === 'user' ? 'User' : 'Assistant';
    return `${label}: ${m.content}`;
  });

  return 'Previous conversation:\n' + lines.join('\n') + '\n\n';
}

/**
 * Get a chat response from Claude CLI.
 * Fetches chat history, builds system prompt, calls CLI, saves messages.
 *
 * @param {string} threadId - Conversation thread ID
 * @param {string} message - User's message text
 * @param {Array} [attachments=[]] - Attachments (currently text-only supported via CLI)
 * @param {object} [options] - { userId, chatTitle, skipUserPersist }
 * @returns {Promise<string>} The assistant's response text
 */
async function getChatResponse(threadId, message, attachments = [], options = {}) {
  // Save user message to DB (skip on regeneration)
  if (!options.skipUserPersist) {
    persistMessage(threadId, 'user', message || '[attachment]', options);
  }

  // Build system prompt with knowledge context
  const systemPrompt = await buildSystemPrompt(message || '');

  // Enrich the system prompt with any relevant knowledge docs
  let knowledgeContext = '';
  try {
    const docs = await searchKnowledge(message || '', 5);
    if (docs.length > 0) {
      knowledgeContext = '\n\nRelevant knowledge base documents:\n';
      for (const doc of docs) {
        knowledgeContext += `\n--- ${doc.title} (${doc.category}) ---\n${doc.content}\n`;
      }
    }
  } catch {
    // Knowledge search unavailable, continue without it
  }

  const fullSystemPrompt = systemPrompt + knowledgeContext;

  // Build the full message with conversation history
  let fullMessage = message || '';

  // Append text from any text-based attachments
  for (const att of attachments) {
    if (att.category === 'image') {
      // CLI doesn't support image attachments directly, note it
      fullMessage += '\n\n[An image was attached but cannot be processed in this mode]';
    }
  }

  // Call Claude CLI
  const response = await callClaude(fullMessage, fullSystemPrompt);

  // Save assistant response to DB
  if (response) {
    persistMessage(threadId, 'assistant', response, options);
  }

  // Auto-generate title for new chats
  if (options.userId && message) {
    autoTitle(threadId, message).catch(() => {});
  }

  return response;
}

/**
 * Streaming chat generator -- wraps getChatResponse for backward compat.
 * Gets the full response then yields it as a single text chunk.
 *
 * @param {string} threadId
 * @param {string} message
 * @param {Array} attachments
 * @param {object} options
 * @returns {AsyncIterableIterator<{type: string, text?: string}>}
 */
async function* chatStream(threadId, message, attachments = [], options = {}) {
  const response = await getChatResponse(threadId, message, attachments, options);
  if (response) {
    yield { type: 'text', text: response };
  }
}

/**
 * Auto-generate a chat title from the first user message (fire-and-forget).
 */
async function autoTitle(threadId, firstMessage) {
  try {
    const chat = await getChatById(threadId);
    if (!chat || chat.title !== 'New Chat') return;

    const title = await callClaude(
      firstMessage,
      'Generate a concise, descriptive title (5-10 words) for this chat. Return ONLY the title text, nothing else.'
    );

    if (title) {
      await updateChatTitle(threadId, title.trim());
      return title.trim();
    }
  } catch (err) {
    console.error('[autoTitle] Failed to generate title:', err.message);
  }
  return null;
}

export { chatStream, getChatResponse, persistMessage, autoTitle };
