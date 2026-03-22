import { auth } from '@/lib/auth/index';
import { ClusterLogsPage } from '@/lib/cluster/components/index';

export default async function ClusterLogsRoute({ params }) {
  const session = await auth();
  const { clusterId } = await params;
  return <ClusterLogsPage session={session} clusterId={clusterId} />;
}
