import { getPageAuthState } from '@/lib/auth/index';
import { getAllSettings } from '@/lib/db/settings';
import { AsciiLogo, SetupForm, LoginForm } from '@/lib/auth/components/index';

export default async function LoginPage() {
  const { needsSetup } = await getPageAuthState();
  let branding = {};
  try {
    const settings = await getAllSettings();
    branding = {
      companyName: settings.company_name || '',
      logoUrl: settings.logo_url || '',
      primaryColor: settings.primary_color || '',
      welcomeText: settings.welcome_text || '',
    };
  } catch {
    // Branding not available yet, use defaults
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      {branding.logoUrl ? (
        <div className="mb-6">
          <img src={branding.logoUrl} alt={branding.companyName || 'Logo'} className="h-16 w-auto" />
        </div>
      ) : (
        <AsciiLogo />
      )}
      {branding.companyName && (
        <h1 className="text-xl font-semibold mb-2">{branding.companyName}</h1>
      )}
      {branding.welcomeText && (
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">{branding.welcomeText}</p>
      )}
      {needsSetup ? <SetupForm /> : <LoginForm />}
    </main>
  );
}
