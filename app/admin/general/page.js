import { auth } from '@/lib/auth/index';
import { SettingsGeneralPage } from '@/lib/chat/components/index';

export default async function SettingsGeneralRoute() {
  const session = await auth();
  return <SettingsGeneralPage session={session} />;
}
