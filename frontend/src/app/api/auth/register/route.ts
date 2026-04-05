import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api-url';
import { attachAuthCookies, getAccessTokenFromRequest } from '@/lib/auth-bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const base = getInternalApiBase();

  const access = getAccessTokenFromRequest(request);

  const upstream = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
    },
    body,
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  if (!data.accessToken || !data.refreshToken || !data.user) {
    return NextResponse.json(
      { message: 'Invalid register response from server' },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ user: data.user });
  attachAuthCookies(res, data.accessToken, data.refreshToken, request);
  return res;
}
