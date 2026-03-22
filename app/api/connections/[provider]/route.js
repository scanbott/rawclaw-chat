import { auth } from '@/lib/auth/index';
import { NextResponse } from 'next/server';
import { deleteConnection } from '@/lib/db/connections';

const PROVIDERS = {
  google: () => import('@/lib/connections/google'),
  fathom: () => import('@/lib/connections/fathom'),
};

export async function GET(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await params;
  const url = new URL(request.url);

  if (!PROVIDERS[provider]) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 });
  }

  // OAuth callback
  const code = url.searchParams.get('code');
  if (code) {
    try {
      const stateParam = url.searchParams.get('state');
      let userId = session.user.id;
      if (stateParam) {
        try {
          const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
          userId = state.userId || userId;
        } catch { /* use session user */ }
      }

      const mod = await PROVIDERS[provider]();
      await mod.handleCallback(code, userId);
      return NextResponse.redirect(new URL('/profile/connections', request.url));
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Initiate OAuth flow
  try {
    const mod = await PROVIDERS[provider]();
    const authUrl = mod.getAuthUrl(session.user.id);
    return NextResponse.json({ url: authUrl });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { provider } = await params;

  try {
    await deleteConnection(session.user.id, provider);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
