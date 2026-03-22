'use client';

import { useState, useEffect } from 'react';

export function SettingsBrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [secondaryColor, setSecondaryColor] = useState('#666666');
  const [welcomeText, setWelcomeText] = useState('');

  useEffect(() => {
    fetch('/api/settings/branding')
      .then(r => r.json())
      .then(data => {
        if (data.company_name) setCompanyName(data.company_name);
        if (data.logo_url) setLogoUrl(data.logo_url);
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.secondary_color) setSecondaryColor(data.secondary_color);
        if (data.welcome_text) setWelcomeText(data.welcome_text);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          logo_url: logoUrl,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          welcome_text: welcomeText,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Failed to save branding settings');
    } finally {
      setSaving(false);
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
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-medium">Branding</h2>
        <p className="text-sm text-muted-foreground">Customize your company branding and login page.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
          <p className="text-sm font-medium text-green-500">Settings saved.</p>
        </div>
      )}

      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Company"
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          {logoUrl && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-10 w-10 rounded object-contain border border-border"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span className="text-xs text-muted-foreground">Preview</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-8 w-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 rounded-md border border-border bg-input px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-8 w-8 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1 rounded-md border border-border bg-input px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Login Page Welcome Text</label>
          <textarea
            value={welcomeText}
            onChange={(e) => setWelcomeText(e.target.value)}
            placeholder="Welcome to your AI assistant..."
            rows={3}
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground resize-y"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md px-4 py-2 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
