import { auth } from '@/lib/auth/index';
import { getUsers, createUser } from '@/lib/db/users';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const role = session.user.role;
  if (role !== 'manager' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const users = await getUsers();
    return NextResponse.json(users);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const role = session.user.role;
  if (role !== 'manager' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (!body.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const { hashSync, genSaltSync } = await import('bcrypt-ts');
    // Generate a temporary password for invited users
    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = hashSync(tempPassword, genSaltSync(10));

    const user = await createUser({
      email: body.email,
      passwordHash,
      role: body.role || 'member',
    });

    return NextResponse.json({ ...user, temporaryPassword: tempPassword });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
