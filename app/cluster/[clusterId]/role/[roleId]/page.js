import { auth } from '@/lib/auth/index';
import { ClusterPage } from '@/lib/cluster/components/index';

export default async function ClusterRoleRoute({ params }) {
  const session = await auth();
  const { clusterId, roleId } = await params;
  return <ClusterPage session={session} clusterId={clusterId} roleId={roleId} />;
}
