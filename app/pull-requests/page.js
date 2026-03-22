import { auth } from '@/lib/auth/index';
import { PullRequestsPage } from '@/lib/chat/components/index';

export default async function PullRequestsRoute() {
  const session = await auth();
  return <PullRequestsPage session={session} />;
}
