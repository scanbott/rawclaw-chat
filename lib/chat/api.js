import { auth } from '../auth/index.js';
import { getChatResponse } from '../ai/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST handler for /stream/chat -- streaming chat with session auth.
 * Gets full response from Claude CLI, then simulates streaming word-by-word.
 */
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { messages, chatId: rawChatId, trigger } = body;

  if (!messages?.length) {
    return Response.json({ error: 'No messages' }, { status: 400 });
  }

  // Get the last user message -- AI SDK v5 sends UIMessage[] with parts
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUserMessage) {
    return Response.json({ error: 'No user message' }, { status: 400 });
  }

  // Extract text from message parts (AI SDK v5+) or fall back to content
  let userText =
    lastUserMessage.parts
      ?.filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('\n') ||
    lastUserMessage.content ||
    '';

  // Extract file parts from message
  const fileParts = lastUserMessage.parts?.filter((p) => p.type === 'file') || [];
  const attachments = [];

  for (const part of fileParts) {
    const { mediaType, url } = part;
    if (!mediaType || !url) continue;

    if (mediaType.startsWith('image/') || mediaType === 'application/pdf') {
      // Images and PDFs -> pass as visual attachments
      attachments.push({ category: 'image', mimeType: mediaType, dataUrl: url });
    } else if (mediaType.startsWith('text/') || mediaType === 'application/json') {
      // Text files -> decode base64 data URL and inline into message text
      try {
        const base64Data = url.split(',')[1];
        const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        const fileName = part.name || 'file';
        userText += `\n\nFile: ${fileName}\n\`\`\`\n${textContent}\n\`\`\``;
      } catch (e) {
        console.error('Failed to decode text file:', e);
      }
    }
  }

  if (!userText.trim() && attachments.length === 0) {
    return Response.json({ error: 'Empty message' }, { status: 400 });
  }

  const threadId = rawChatId || uuidv4();
  const { createUIMessageStream, createUIMessageStreamResponse } = await import('ai');

  const stream = createUIMessageStream({
    onError: (error) => {
      console.error('Chat stream error:', error);
      return error?.message || 'An error occurred while processing your message.';
    },
    execute: async ({ writer }) => {
      const skipUserPersist = trigger === 'regenerate-message';
      const streamOptions = {
        userId: session.user.id,
        skipUserPersist,
      };

      // Get full response from Claude CLI
      const response = await getChatResponse(threadId, userText, attachments, streamOptions);

      // Signal start of assistant message
      writer.write({ type: 'start' });

      const textId = uuidv4();
      writer.write({ type: 'text-start', id: textId });

      // Drip text out word by word for streaming effect
      const words = response.split(/(\s+)/);
      for (const word of words) {
        if (word) {
          writer.write({ type: 'text-delta', id: textId, delta: word });
          // Small delay between words for streaming effect
          await new Promise((r) => setTimeout(r, 12));
        }
      }

      writer.write({ type: 'text-end', id: textId });
      writer.write({ type: 'finish' });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function finalizeChat(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { chatId, message } = await request.json();
  const { autoTitle } = await import('../ai/index.js');
  const title = await autoTitle(chatId, message);

  return Response.json({ title });
}
