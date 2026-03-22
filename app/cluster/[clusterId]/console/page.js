import { auth } from '@/lib/auth/index';
import { ClusterConsolePage } from '@/lib/cluster/components/index';

export default async function ClusterConsoleRoute({ params }) {
  const session = await auth();
  const { clusterId } = await params;
  return <ClusterConsolePage session={session} clusterId={clusterId} />;
}
