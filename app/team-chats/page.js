import { auth } from '@/lib/auth/index';
import { PageLayout } from '@/lib/chat/components/index';
import { TeamChatsPage } from '@/lib/chat/components/team-chats-page';

export default async function TeamChatsRoute() {
  const session = await auth();
  return (
    <PageLayout session={session}>
      <TeamChatsPage session={session} />
    </PageLayout>
  );
}
