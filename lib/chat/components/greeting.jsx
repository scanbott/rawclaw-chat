'use client';

import { useState, useEffect } from 'react';

export function Greeting() {
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    fetch('/api/settings/branding')
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        if (data.company_name) setCompanyName(data.company_name);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="w-full text-center">
      <div className="font-semibold text-2xl md:text-3xl text-foreground">
        {companyName ? `Welcome to ${companyName}` : 'Hello! How can I help?'}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Ask me anything or start a conversation.
      </p>
    </div>
  );
}
