import { auth } from '@/lib/auth/index';
import { ChatsPage } from '@/lib/chat/components/index';

export default async function ChatsRoute() {
  const session = await auth();
  return <ChatsPage session={session} />;
}
