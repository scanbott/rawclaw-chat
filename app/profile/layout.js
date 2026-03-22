import { auth } from '@/lib/auth/index';
import { ProfileLayout } from '@/lib/chat/components/index';

export default async function Layout({ children }) {
  const session = await auth();
  return <ProfileLayout session={session}>{children}</ProfileLayout>;
}
