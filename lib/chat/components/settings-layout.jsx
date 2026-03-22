'use client';

import { useState, useEffect } from 'react';
import { PageLayout } from './page-layout.js';
import { UserIcon, SettingsIcon } from './icons.js';

function PaletteIcon({ size = 14 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </svg>
  );
}

function BookIcon({ size = 14 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

const TABS = [
  { id: 'general', label: 'General', href: '/admin/general', icon: SettingsIcon },
  { id: 'users', label: 'Users', href: '/admin/users', icon: UserIcon },
  { id: 'knowledge', label: 'Knowledge Base', href: '/admin/knowledge', icon: BookIcon },
  { id: 'branding', label: 'Branding', href: '/admin/branding', icon: PaletteIcon },
];

export function SettingsLayout({ session, children }) {
  const [activePath, setActivePath] = useState('');

  useEffect(() => {
    setActivePath(window.location.pathname);
  }, []);

  return (
    <PageLayout session={session}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Admin</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activePath === tab.href || activePath.startsWith(tab.href + '/');
          const Icon = tab.icon;
          return (
            <a
              key={tab.id}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-3 py-2 min-h-[44px] shrink-0 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </a>
          );
        })}
      </div>

      {/* Tab content */}
      {children}
    </PageLayout>
  );
}
