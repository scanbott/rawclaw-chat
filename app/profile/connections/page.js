import { auth } from '@/lib/auth/index';
import { redirect } from 'next/navigation';
import { ConnectionsPage } from './connections-page';

export default async function Connections() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return <ConnectionsPage userId={session.user.id} />;
}
