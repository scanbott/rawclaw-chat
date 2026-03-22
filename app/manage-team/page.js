import { auth } from '@/lib/auth/index';
import { PageLayout } from '@/lib/chat/components/index';
import { ManageTeamPage } from '@/lib/chat/components/manage-team-page';

export default async function ManageTeamRoute() {
  const session = await auth();
  return (
    <PageLayout session={session}>
      <ManageTeamPage session={session} />
    </PageLayout>
  );
}
