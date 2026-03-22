import { auth } from '@/lib/auth/index';
import { getMessages } from '@/lib/db/chats';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const role = session.user.role;
  if (role !== 'manager' && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { chatId } = await params;
  try {
    const messages = await getMessages(chatId);
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
