'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from './icons.js';
import { Dialog, EmptyState, formatDate } from './settings-shared.js';

const CATEGORIES = ['general', 'brand', 'product', 'audience', 'procedure'];
const STATUSES = ['approved', 'pending', 'rejected'];

export function SettingsKnowledgePage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingDoc, setEditingDoc] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);

  const loadDocs = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, [filterCategory, filterStatus]);

  const handleDelete = async (id) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete document');
      } else {
        setDocs(prev => prev.filter(d => d.id !== id));
      }
    } catch {
      setError('Failed to delete document');
    }
    setConfirmDelete(null);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await fetch(`/api/knowledge/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    } catch {
      setError('Failed to update status');
    }
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
          <h2 className="text-base font-medium">Knowledge Base</h2>
          <p className="text-sm text-muted-foreground">Manage documents the AI uses as context.</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setEditingDoc(null); }}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-foreground text-background hover:bg-foreground/90 shrink-0 transition-colors"
        >
          <PlusIcon size={14} />
          Add document
        </button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {/* Document list */}
      {docs.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="divide-y divide-border">
            {docs.map((doc) => (
              <div key={doc.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{doc.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      {doc.category || 'general'}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      doc.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                      doc.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {doc.status || 'approved'}
                    </span>
                    <span>{formatDate(doc.updated_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                  {doc.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(doc.id, 'approved')}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-green-500/50 text-green-500 hover:bg-green-500/10 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(doc.id, 'rejected')}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { setEditingDoc(doc); setShowCreate(true); }}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium border shrink-0 transition-colors ${
                      confirmDelete === doc.id
                        ? 'border-destructive text-destructive hover:bg-destructive/10'
                        : 'border-border text-muted-foreground hover:text-destructive hover:border-destructive/50'
                    }`}
                  >
                    <TrashIcon size={12} />
                    {confirmDelete === doc.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          message="No documents found"
          actionLabel="Add document"
          onAction={() => { setShowCreate(true); setEditingDoc(null); }}
        />
      )}

      {/* Create/Edit dialog */}
      <KnowledgeDocDialog
        open={showCreate}
        doc={editingDoc}
        onSave={async () => {
          setShowCreate(false);
          setEditingDoc(null);
          setLoading(true);
          await loadDocs();
        }}
        onCancel={() => { setShowCreate(false); setEditingDoc(null); }}
      />
    </div>
  );
}

function KnowledgeDocDialog({ open, doc, onSave, onCancel }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [status, setStatus] = useState('approved');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      if (doc) {
        setTitle(doc.title || '');
        setContent(doc.content || '');
        setCategory(doc.category || 'general');
        setStatus(doc.status || 'approved');
      } else {
        setTitle('');
        setContent('');
        setCategory('general');
        setStatus('approved');
      }
      setError(null);
    }
  }, [open, doc]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = doc ? `/api/knowledge/${doc.id}` : '/api/knowledge';
      const method = doc ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save document');
      } else {
        onSave();
      }
    } catch {
      setError('Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} title={doc ? 'Edit Document' : 'New Document'}>
      {error && <p className="text-sm text-destructive mb-3">{error}</p>}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium mb-1 block">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            autoFocus
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium mb-1 block">Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Document content..."
            rows={8}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-y"
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Dialog>
  );
}
