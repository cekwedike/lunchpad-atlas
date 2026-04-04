import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api-url';
import {
  ACCESS_COOKIE,
  LEGACY_ACCESS_COOKIE,
} from '@/lib/auth-cookie-names';
import { attachAuthCookies } from '@/lib/auth-bff';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const base = getInternalApiBase();

  const access =
    request.cookies.get(ACCESS_COOKIE)?.value ??
    request.cookies.get(LEGACY_ACCESS_COOKIE)?.value;

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
  attachAuthCookies(res, data.accessToken, data.refreshToken);
  return res;
}
