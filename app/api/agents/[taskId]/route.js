import { auth } from '@/lib/auth/index';
import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase/client';

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('agent_logs')
      .select('id, agent_id, status, result, metadata, started_at, completed_at')
      .eq('id', taskId)
      .eq('user_id', session.user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
