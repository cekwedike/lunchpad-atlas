import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api-url';
import { ACCESS_COOKIE } from '@/lib/auth-cookie-names';
import {
  cookieShouldBeSecure,
  getRefreshTokenFromRequestAsync,
  jwtRemainingSeconds,
} from '@/lib/auth-bff';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const refresh = await getRefreshTokenFromRequestAsync(request);
  if (!refresh) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const base = getInternalApiBase();
  const upstream = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  if (!data.accessToken) {
    return NextResponse.json(
      { message: 'Invalid refresh response from server' },
      { status: 502 },
    );
  }

  const accessToken = data.accessToken as string;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: cookieShouldBeSecure(request),
    maxAge: jwtRemainingSeconds(accessToken),
  });
  return res;
}
