import { auth } from '@/lib/auth/index';
import { SettingsLayout } from '@/lib/chat/components/index';

export default async function Layout({ children }) {
  const session = await auth();
  return <SettingsLayout session={session}>{children}</SettingsLayout>;
}
