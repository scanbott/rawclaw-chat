import { auth } from '@/lib/auth/index';
import { ClustersLayout } from '@/lib/cluster/components/index';

export default async function Layout({ children }) {
  const session = await auth();
  return <ClustersLayout session={session}>{children}</ClustersLayout>;
}
