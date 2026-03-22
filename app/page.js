import { auth } from '@/lib/auth/index';
import { ChatPage } from '@/lib/chat/components/index';

export default async function Home() {
  const session = await auth();
  return <ChatPage session={session} needsSetup={false} />;
}
