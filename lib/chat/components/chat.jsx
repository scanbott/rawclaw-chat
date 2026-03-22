'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Messages } from './messages.js';
import { ChatInput } from './chat-input.js';
import { ChatHeader } from './chat-header.js';
import { Greeting } from './greeting.js';

export function Chat({ chatId, initialMessages = [] }) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const hasNavigated = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/stream/chat',
        body: () => ({ chatId }),
      }),
    [chatId]
  );

  const {
    messages,
    status,
    stop,
    error,
    sendMessage,
    regenerate,
    setMessages,
  } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onError: (err) => console.error('Chat error:', err),
  });

  // After first message sent, update URL and notify sidebar
  useEffect(() => {
    if (!hasNavigated.current && messages.length >= 1 && status !== 'ready' && window.location.pathname !== `/chat/${chatId}`) {
      hasNavigated.current = true;
      window.history.replaceState({}, '', `/chat/${chatId}`);
    }
  }, [messages.length, status, chatId]);

  const handleSend = async () => {
    if (!input.trim() && files.length === 0) return;
    const text = input;
    const isFirstMessage = messages.length === 0;
    const currentFiles = files;
    setInput('');
    setFiles([]);

    const fileParts = currentFiles.map((f) => ({
      type: 'file',
      mediaType: f.file.type || 'text/plain',
      url: f.previewUrl,
      filename: f.file.name,
    }));
    await sendMessage({ text: text || undefined, files: fileParts });

    if (isFirstMessage && text) {
      fetch('/chat/finalize-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message: text }),
      })
        .then(res => res.json())
        .then(({ title }) => {
          if (title) {
            window.dispatchEvent(new CustomEvent('chatTitleUpdated', { detail: { chatId, title } }));
          }
        })
        .catch(err => console.error('Failed to finalize chat:', err));
    }
  };

  const handleRetry = useCallback((message) => {
    if (message.role === 'assistant') {
      regenerate({ messageId: message.id });
    } else {
      const idx = messages.findIndex((m) => m.id === message.id);
      const nextAssistant = messages.slice(idx + 1).find((m) => m.role === 'assistant');
      if (nextAssistant) {
        regenerate({ messageId: nextAssistant.id });
      } else {
        const text =
          message.parts
            ?.filter((p) => p.type === 'text')
            .map((p) => p.text)
            .join('\n') ||
          message.content ||
          '';
        if (text.trim()) {
          sendMessage({ text });
        }
      }
    }
  }, [messages, regenerate, sendMessage]);

  const handleEdit = useCallback((message, newText) => {
    const idx = messages.findIndex((m) => m.id === message.id);
    if (idx === -1) return;
    setMessages(messages.slice(0, idx));
    sendMessage({ text: newText });
  }, [messages, setMessages, sendMessage]);

  return (
    <div className="flex h-svh flex-col">
      <ChatHeader chatId={chatId} />
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-2.5 md:px-6">
          <div className="w-full max-w-4xl">
            <Greeting />
            {error && (
              <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error.message || 'Something went wrong. Please try again.'}
              </div>
            )}
            <div className="mt-4">
              <ChatInput
                input={input}
                setInput={setInput}
                onSubmit={handleSend}
                status={status}
                stop={stop}
                files={files}
                setFiles={setFiles}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden relative">
          <Messages messages={messages} status={status} onRetry={handleRetry} onEdit={handleEdit} />
          {error && (
            <div className="mx-auto w-full max-w-4xl px-2 md:px-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error.message || 'Something went wrong. Please try again.'}
              </div>
            </div>
          )}
          <div className="px-2.5 md:px-0">
            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={handleSend}
              status={status}
              stop={stop}
              files={files}
              setFiles={setFiles}
            />
          </div>
        </div>
      )}
    </div>
  );
}
