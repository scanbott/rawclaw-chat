'use client';

import { useState, useEffect } from 'react';
import { UserIcon, PlusIcon, TrashIcon } from './icons.js';
import { Dialog, EmptyState, formatDate } from './settings-shared.js';

export function ManageTeamPage({ session }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/team-members');
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || inviting) return;
    setInviting(true);
    setError(null);
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to invite member');
      } else {
        setInviteEmail('');
        setInviteRole('member');
        setShowInvite(false);
        await loadMembers();
      }
    } catch {
      setError('Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (id) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/team-members/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to remove member');
      } else {
        setMembers(prev => prev.filter(m => m.id !== id));
      }
    } catch {
      setError('Failed to remove member');
    }
    setConfirmDelete(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-md bg-border/50" />
        <div className="h-16 animate-pulse rounded-md bg-border/50" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-medium">Team Members</h2>
          <p className="text-sm text-muted-foreground">Manage your team members and their roles.</p>
        </div>
        {!showInvite && (
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 shrink-0 transition-colors"
          >
            <PlusIcon size={14} />
            Invite member
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="rounded-lg border border-dashed bg-card p-4 mb-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="member@example.com"
                autoFocus
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || inviting}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              {inviting ? 'Inviting...' : 'Invite'}
            </button>
            <button
              onClick={() => { setShowInvite(false); setInviteEmail(''); setError(null); }}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Member list */}
      {members.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
                <div className="flex items-center gap-2 min-w-0">
                  <UserIcon size={14} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.name || m.email}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium mr-1.5">{m.role || 'member'}</span>
                      {m.email}
                      {m.created_at && <span> - Joined {formatDate(m.created_at)}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  {m.id !== session?.user?.id && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border shrink-0 transition-colors ${
                        confirmDelete === m.id
                          ? 'border-destructive text-destructive hover:bg-destructive/10'
                          : 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/50'
                      }`}
                    >
                      <TrashIcon size={12} />
                      {confirmDelete === m.id ? 'Confirm' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !showInvite && (
        <EmptyState
          message="No team members yet"
          actionLabel="Invite member"
          onAction={() => setShowInvite(true)}
        />
      )}
    </div>
  );
}
