import { auth } from '@/lib/auth/index';
import { getKnowledgeDocs, createKnowledgeDoc } from '@/lib/db/knowledge';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || undefined;
  const status = searchParams.get('status') || undefined;

  try {
    const docs = await getKnowledgeDocs({ category, status: status || undefined, limit: 200 });
    return NextResponse.json(docs);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const doc = await createKnowledgeDoc({
      title: body.title,
      content: body.content,
      category: body.category || 'general',
      status: body.status || 'approved',
      createdBy: session.user.id,
    });
    return NextResponse.json(doc);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
