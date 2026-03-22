import { auth } from '@/lib/auth/index';
import { NextResponse } from 'next/server';
import { getUserConnections } from '@/lib/db/connections';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const connections = await getUserConnections(session.user.id);
    return NextResponse.json({ connections });
  } catch {
    return NextResponse.json({ connections: [] });
  }
}
