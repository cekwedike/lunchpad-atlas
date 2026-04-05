import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api-url';
import { attachAuthCookies } from '@/lib/auth-bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const base = getInternalApiBase();
  const upstream = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  if (!data.accessToken || !data.refreshToken || !data.user) {
    return NextResponse.json(
      { message: 'Invalid login response from server' },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ user: data.user });
  attachAuthCookies(res, data.accessToken, data.refreshToken, request);
  return res;
}
