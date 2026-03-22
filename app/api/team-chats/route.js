import { auth } from '@/lib/auth/index';
import { getTeamChats } from '@/lib/db/chats';
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
    // For admin, get all chats; for manager, get team chats
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    const supabase = getSupabaseClient();

    let query = supabase
      .from('chats')
      .select('*, users:user_id(name, email, team_id)')
      .order('updated_at', { ascending: false })
      .limit(100);

    // If manager (not admin), filter to team
    if (role === 'manager') {
      const { data: currentUser } = await supabase
        .from('users')
        .select('team_id')
        .eq('id', session.user.id)
        .single();
      if (currentUser?.team_id) {
        query = supabase
          .from('chats')
          .select('*, users!inner(name, email, team_id)')
          .eq('users.team_id', currentUser.team_id)
          .order('updated_at', { ascending: false })
          .limit(100);
      }
    }

    const { data, error } = await query;
    if (error) return NextResponse.json([], { status: 500 });
    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
