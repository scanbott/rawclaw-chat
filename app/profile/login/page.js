import { auth } from '@/lib/auth/index';
import { ProfileLoginPage } from '@/lib/chat/components/index';

export default async function Page() {
  const session = await auth();
  return <ProfileLoginPage session={session} />;
}
