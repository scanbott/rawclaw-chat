import { auth } from '@/lib/auth/index';
import { updateKnowledgeDoc, deleteKnowledgeDoc } from '@/lib/db/knowledge';
import { NextResponse } from 'next/server';

export async function PATCH(request, { params }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const updates = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.category !== undefined) updates.category = body.category;
    if (body.status !== undefined) updates.status = body.status;
    await updateKnowledgeDoc(id, updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  try {
    await deleteKnowledgeDoc(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
