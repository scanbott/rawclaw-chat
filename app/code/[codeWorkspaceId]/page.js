import { auth } from '@/lib/auth/index';
import { CodePage } from '@/lib/code/index';

export default async function CodeRoute({ params }) {
  const session = await auth();
  const { codeWorkspaceId } = await params;
  return <CodePage session={session} codeWorkspaceId={codeWorkspaceId} />;
}
