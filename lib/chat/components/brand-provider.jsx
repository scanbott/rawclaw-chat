'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const BrandContext = createContext({
  companyName: 'RawClaw',
  logoUrl: null,
  primaryColor: '#014421',
  secondaryColor: '#0a0a0a',
  welcomeText: 'How can I help you today?',
  loaded: false,
});

export function BrandProvider({ children, initialBranding }) {
  const [brand, setBrand] = useState({
    companyName: initialBranding?.company_name || 'RawClaw',
    logoUrl: initialBranding?.logo_url || null,
    primaryColor: initialBranding?.primary_color || '#014421',
    secondaryColor: initialBranding?.secondary_color || '#0a0a0a',
    welcomeText: initialBranding?.welcome_text || 'How can I help you today?',
    loaded: !!initialBranding,
  });

  useEffect(() => {
    if (brand.loaded) return;

    fetch('/api/settings/branding')
      .then((res) => res.ok ? res.json() : {})
      .then((data) => {
        setBrand({
          companyName: data.company_name || 'RawClaw',
          logoUrl: data.logo_url || null,
          primaryColor: data.primary_color || '#014421',
          secondaryColor: data.secondary_color || '#0a0a0a',
          welcomeText: data.welcome_text || 'How can I help you today?',
          loaded: true,
        });
      })
      .catch(() => {
        setBrand((prev) => ({ ...prev, loaded: true }));
      });
  }, [brand.loaded]);

  useEffect(() => {
    if (!brand.loaded) return;
    document.documentElement.style.setProperty('--brand-primary', brand.primaryColor);
    document.documentElement.style.setProperty('--brand-secondary', brand.secondaryColor);
  }, [brand.primaryColor, brand.secondaryColor, brand.loaded]);

  return (
    <BrandContext.Provider value={brand}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
