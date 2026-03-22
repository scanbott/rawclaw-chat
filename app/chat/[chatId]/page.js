import { auth } from '@/lib/auth/index';
import { ChatPage } from '@/lib/chat/components/index';

export default async function ChatRoute({ params }) {
  const { chatId } = await params;
  const session = await auth();
  return <ChatPage session={session} needsSetup={false} chatId={chatId} />;
}
