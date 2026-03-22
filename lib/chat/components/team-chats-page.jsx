'use client';

import { useState, useEffect } from 'react';
import { MessageIcon, UserIcon } from './icons.js';
import { EmptyState, formatDate } from './settings-shared.js';

export function TeamChatsPage({ session }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetch('/api/team-chats')
      .then(r => r.json())
      .then(data => {
        setChats(Array.isArray(data) ? data : []);
      })
      .catch(() => setChats([]))
      .finally(() => setLoading(false));
  }, []);

  const viewChat = async (chat) => {
    setSelectedChat(chat);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/team-chats/${chat.id}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-md bg-border/50" />
        <div className="h-16 animate-pulse rounded-md bg-border/50" />
        <div className="h-16 animate-pulse rounded-md bg-border/50" />
      </div>
    );
  }

  if (selectedChat) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setSelectedChat(null); setMessages([]); }}
            className="rounded-md px-3 py-1.5 text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            Back
          </button>
          <div>
            <h2 className="text-base font-medium">{selectedChat.title || 'Untitled Chat'}</h2>
            <p className="text-xs text-muted-foreground">
              {selectedChat.users?.name || selectedChat.users?.email || 'Unknown user'} - {formatDate(selectedChat.updated_at)}
            </p>
          </div>
        </div>

        {loadingMessages ? (
          <div className="space-y-3">
            <div className="h-12 animate-pulse rounded-md bg-border/50" />
            <div className="h-12 animate-pulse rounded-md bg-border/50" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState message="No messages in this chat" />
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={msg.id || i}
                className={`rounded-lg border p-4 ${
                  msg.role === 'assistant' ? 'bg-muted border-border' : 'bg-card border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                    {msg.role}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-medium">Team Chats</h2>
        <p className="text-sm text-muted-foreground">View chat histories from your team members.</p>
      </div>

      {chats.length === 0 ? (
        <EmptyState message="No team chats found" />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="divide-y divide-border">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => viewChat(chat)}
                className="flex items-center justify-between w-full p-4 text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MessageIcon size={14} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{chat.title || 'Untitled Chat'}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <UserIcon size={10} />
                      <span>{chat.users?.name || chat.users?.email || 'Unknown'}</span>
                      <span>-</span>
                      <span>{formatDate(chat.updated_at)}</span>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">View</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
