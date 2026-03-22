import { createChatStream, handleToolCall } from './agent.js';
import { getChatById, createChat, saveMessageCompat, updateChatTitle } from '../db/chats.js';
import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../config.js';

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
 * Process a chat message with streaming via the Anthropic SDK.
 * Handles tool call loops automatically.
 * Saves user and assistant messages to the DB.
 *
 * @param {string} threadId - Conversation thread ID
 * @param {string} message - User's message text
 * @param {Array} [attachments=[]] - Image/PDF attachments: { category, mimeType, dataUrl }
 * @param {object} [options] - { userId, chatTitle, skipUserPersist }
 * @returns {AsyncIterableIterator<{type: string, ...}>} Stream of chunks
 */
async function* chatStream(threadId, message, attachments = [], options = {}) {
  // Save user message to DB (skip on regeneration)
  if (!options.skipUserPersist) {
    persistMessage(threadId, 'user', message || '[attachment]', options);
  }

  // Build content blocks for the user message
  const content = [];

  if (message) {
    content.push({ type: 'text', text: message });
  }

  for (const att of attachments) {
    if (att.category === 'image') {
      // Extract base64 data from data URL
      const dataUrl = att.dataUrl || `data:${att.mimeType};base64,${att.data.toString('base64')}`;
      const base64Match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        const mediaType = base64Match[1];
        const data = base64Match[2];
        if (mediaType === 'application/pdf') {
          content.push({
            type: 'document',
            source: { type: 'base64', media_type: mediaType, data },
          });
        } else {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data },
          });
        }
      }
    }
  }

  // If only text and no attachments, simplify to a string
  const messageContent = content.length === 1 && content[0].type === 'text'
    ? content[0].text
    : content;

  // Build messages array -- for now just the current message.
  // Chat history is loaded from Supabase on the client side and sent in the request.
  const messages = [{ role: 'user', content: messageContent }];

  try {
    let fullText = '';

    // Tool call loop: keep calling the model until it stops using tools
    let continueLoop = true;
    while (continueLoop) {
      continueLoop = false;

      const stream = await createChatStream({
        messages,
        userId: options.userId,
        chatId: threadId,
      });

      // Collect the full response for tool call handling
      let currentToolUse = null;
      let toolInputJson = '';
      const toolUseBlocks = [];
      let responseText = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolUse = {
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            };
            toolInputJson = '';
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            responseText += event.delta.text;
            fullText += event.delta.text;
            yield { type: 'text', text: event.delta.text };
          } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
            toolInputJson += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          if (currentToolUse) {
            try {
              currentToolUse.input = JSON.parse(toolInputJson);
            } catch {
              currentToolUse.input = {};
            }
            toolUseBlocks.push(currentToolUse);

            // Emit tool call event to the UI
            yield {
              type: 'tool-call',
              toolCallId: currentToolUse.id,
              toolName: currentToolUse.name,
              args: currentToolUse.input,
            };

            currentToolUse = null;
            toolInputJson = '';
          }
        }
      }

      // If there were tool calls, handle them and continue the loop
      if (toolUseBlocks.length > 0) {
        // Add assistant message with the tool use blocks
        const assistantContent = [];
        if (responseText) {
          assistantContent.push({ type: 'text', text: responseText });
        }
        for (const tu of toolUseBlocks) {
          assistantContent.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input });
        }
        messages.push({ role: 'assistant', content: assistantContent });

        // Execute each tool and collect results
        const toolResults = [];
        for (const tu of toolUseBlocks) {
          const result = await handleToolCall(tu.name, tu.input, options.userId);

          // Persist tool invocation
          persistMessage(threadId, 'assistant', JSON.stringify({
            type: 'tool-invocation',
            toolCallId: tu.id,
            toolName: tu.name,
            state: 'output-available',
            input: tu.input,
            output: result,
          }), options);

          // Emit tool result to UI
          yield {
            type: 'tool-result',
            toolCallId: tu.id,
            result,
          };

          toolResults.push({
            type: 'tool_result',
            tool_use_id: tu.id,
            content: result,
          });
        }

        // Add tool results as user message
        messages.push({ role: 'user', content: toolResults });
        continueLoop = true;
      }
    }

    // Save final assistant text to DB
    if (fullText) {
      persistMessage(threadId, 'assistant', fullText, options);
    }

    // Auto-generate title for new chats
    if (options.userId && message) {
      autoTitle(threadId, message).catch(() => {});
    }

  } catch (err) {
    console.error('[chatStream] error:', err);
    throw err;
  }
}

/**
 * Auto-generate a chat title from the first user message (fire-and-forget).
 */
async function autoTitle(threadId, firstMessage) {
  try {
    const chat = await getChatById(threadId);
    if (!chat || chat.title !== 'New Chat') return;

    const apiKey = getConfig('ANTHROPIC_API_KEY');
    if (!apiKey) return;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: getConfig('LLM_MODEL') || 'claude-sonnet-4-20250514',
      max_tokens: 100,
      system: 'Generate a concise, descriptive title (5-10 words) for this chat. Return ONLY the title text, nothing else.',
      messages: [{ role: 'user', content: firstMessage }],
    });

    const title = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    if (title) {
      await updateChatTitle(threadId, title);
      return title;
    }
  } catch (err) {
    console.error('[autoTitle] Failed to generate title:', err.message);
  }
  return null;
}

export { chatStream, persistMessage, autoTitle };
