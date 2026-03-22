import { auth } from '@/lib/auth/index';
import { ClusterPage } from '@/lib/cluster/components/index';

export default async function ClusterRoute({ params }) {
  const session = await auth();
  const { clusterId } = await params;
  return <ClusterPage session={session} clusterId={clusterId} />;
}
