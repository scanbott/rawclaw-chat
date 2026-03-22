import './globals.css';
import { ThemeProvider, FeaturesProvider } from '@/lib/chat/components/index';
import { BrandProvider } from '@/lib/chat/components/brand-provider';
import { getOAuthTokenCount } from '@/lib/db/oauth-tokens';
import { getBranding } from '@/lib/branding';

export async function generateMetadata() {
  let branding;
  try {
    branding = await getBranding();
  } catch {
    branding = { company_name: 'RawClaw' };
  }
  return {
    title: branding.company_name,
    description: 'AI Agent',
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

function hasOAuthToken() {
  try {
    return getOAuthTokenCount() > 0;
  } catch {
    return false;
  }
}

const hasOAuth = hasOAuthToken() || !!process.env.CLAUDE_CODE_OAUTH_TOKEN;
const features = {
  codeWorkspace: hasOAuth,
  clusterWorkspace: hasOAuth,
};

export default async function RootLayout({ children }) {
  let branding = null;
  try {
    branding = await getBranding();
  } catch {
    // Branding will be fetched client-side
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        style={{
          '--brand-primary': branding?.primary_color || '#014421',
          '--brand-secondary': branding?.secondary_color || '#0a0a0a',
        }}
      >
        <FeaturesProvider features={features}>
          <ThemeProvider>
            <BrandProvider initialBranding={branding}>
              {children}
            </BrandProvider>
          </ThemeProvider>
        </FeaturesProvider>
      </body>
    </html>
  );
}
