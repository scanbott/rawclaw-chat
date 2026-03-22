import { auth } from '@/lib/auth/index';
import { getAllSettings, setSetting } from '@/lib/db/settings';
import { NextResponse } from 'next/server';

const BRANDING_KEYS = ['company_name', 'logo_url', 'primary_color', 'secondary_color', 'welcome_text'];

export async function GET() {
  try {
    const settings = await getAllSettings();
    const branding = {};
    for (const key of BRANDING_KEYS) {
      if (settings[key] !== undefined) branding[key] = settings[key];
    }
    return NextResponse.json(branding);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}

export async function PUT(request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    for (const key of BRANDING_KEYS) {
      if (body[key] !== undefined) {
        await setSetting(key, body[key]);
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
