import { auth } from '@/lib/auth/index';
import { NotificationsPage } from '@/lib/chat/components/index';

export default async function NotificationsRoute() {
  const session = await auth();
  return <NotificationsPage session={session} />;
}
