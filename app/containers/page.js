import { auth } from '@/lib/auth/index';
import { ContainersPage } from '@/lib/chat/components/index';

export default async function ContainersRoute() {
  const session = await auth();
  return <ContainersPage session={session} />;
}
