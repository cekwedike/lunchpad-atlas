import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api-url';
import { ACCESS_COOKIE } from '@/lib/auth-cookie-names';
import {
  authCookieSameSite,
  cookieShouldBeSecure,
  getRefreshTokenFromRequestAsync,
  jwtRemainingSeconds,
} from '@/lib/auth-bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Vary: 'Cookie',
} as const;

function cookieHasRefreshName(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(';').some((p) => p.trim().startsWith('at_refresh='));
}

export async function POST(request: NextRequest) {
  const refresh = await getRefreshTokenFromRequestAsync(request);
  const inboundCookie = request.headers.get('cookie');

  if (!refresh && !cookieHasRefreshName(inboundCookie)) {
    return NextResponse.json(
      { message: 'Unauthorized' },
      {
        status: 401,
        headers: { ...NO_STORE, 'x-atlas-refresh-cookie': 'absent' },
      },
    );
  }

  const base = getInternalApiBase();
  const upstream = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(inboundCookie ? { Cookie: inboundCookie } : {}),
    },
    body: JSON.stringify(refresh ? { refreshToken: refresh } : {}),
    cache: 'no-store',
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(data, {
      status: upstream.status,
      headers: NO_STORE,
    });
  }

  if (!data.accessToken) {
    return NextResponse.json(
      { message: 'Invalid refresh response from server' },
      { status: 502, headers: NO_STORE },
    );
  }

  const accessToken = data.accessToken as string;
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
  const secure = cookieShouldBeSecure(request);
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    path: '/',
    sameSite: authCookieSameSite(secure),
    secure,
    maxAge: jwtRemainingSeconds(accessToken),
  });
  return res;
}
