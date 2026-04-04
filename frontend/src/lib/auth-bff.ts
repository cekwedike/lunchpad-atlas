import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LEGACY_ACCESS_COOKIE,
} from '@/lib/auth-cookie-names';

export { ACCESS_COOKIE, REFRESH_COOKIE, LEGACY_ACCESS_COOKIE };

function readCookieFromHeader(
  cookieHeader: string | null,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    const v = part.slice(idx + 1).trim();
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return undefined;
}

/** Prefer parsed cookies; fall back to raw Cookie header (some runtimes differ). */
export function getAccessTokenFromRequest(request: NextRequest): string | undefined {
  const parsed =
    request.cookies.get(ACCESS_COOKIE)?.value ??
    request.cookies.get(LEGACY_ACCESS_COOKIE)?.value;
  if (parsed) return parsed;
  const raw = request.headers.get('cookie');
  return (
    readCookieFromHeader(raw, ACCESS_COOKIE) ??
    readCookieFromHeader(raw, LEGACY_ACCESS_COOKIE)
  );
}

export function getRefreshTokenFromRequest(request: NextRequest): string | undefined {
  const parsed = request.cookies.get(REFRESH_COOKIE)?.value;
  if (parsed) return parsed;
  return readCookieFromHeader(request.headers.get('cookie'), REFRESH_COOKIE);
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('utf8')
        : atob(base64);
    return JSON.parse(json) as { exp?: number };
  } catch {
    return null;
  }
}

export function jwtRemainingSeconds(token: string): number {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return 15 * 60;
  return Math.max(60, payload.exp - Math.floor(Date.now() / 1000));
}

export function attachAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  const isProd = process.env.NODE_ENV === 'production';
  const accessMax = jwtRemainingSeconds(accessToken);
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isProd,
    maxAge: accessMax,
  });
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isProd,
    maxAge: 60 * 60 * 24 * 90,
  });
}

export function clearAuthCookies(res: NextResponse) {
  const isProd = process.env.NODE_ENV === 'production';
  const empty = { path: '/', maxAge: 0, sameSite: 'lax' as const, secure: isProd };
  res.cookies.set(ACCESS_COOKIE, '', empty);
  res.cookies.set(REFRESH_COOKIE, '', empty);
  res.cookies.set(LEGACY_ACCESS_COOKIE, '', empty);
}
