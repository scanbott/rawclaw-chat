import { auth } from '@/lib/auth/index';
import { deleteUser } from '@/lib/db/users';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const role = session.user.role;
  if (role !== 'manager' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
  }

  try {
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
