'use client';

import { useState, useEffect } from 'react';

const PROVIDERS = [
  { id: 'google', name: 'Google Workspace', description: 'Gmail, Calendar, Drive' },
  { id: 'fathom', name: 'Fathom', description: 'Meeting transcripts and notes' },
];

export function ConnectionsPage({ userId }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/connections/list')
      .then((res) => res.json())
      .then((data) => setConnections(data.connections || []))
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async (provider) => {
    try {
      const res = await fetch(`/api/connections/${provider}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Connection initiation failed
    }
  };

  const handleDisconnect = async (provider) => {
    try {
      await fetch(`/api/connections/${provider}`, { method: 'DELETE' });
      setConnections((prev) => prev.filter((c) => c.provider !== provider));
    } catch {
      // Disconnect failed
    }
  };

  const isConnected = (provider) => connections.some((c) => c.provider === provider);

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Connected Accounts</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Connected Accounts</h1>
      <div className="space-y-4">
        {PROVIDERS.map((provider) => {
          const connected = isConnected(provider.id);
          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
            >
              <div>
                <p className="font-medium">{provider.name}</p>
                <p className="text-sm text-muted-foreground">{provider.description}</p>
              </div>
              {connected ? (
                <button
                  onClick={() => handleDisconnect(provider.id)}
                  className="px-4 py-2 text-sm rounded-md border border-destructive text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(provider.id)}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Connect
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
