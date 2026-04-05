import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LEGACY_ACCESS_COOKIE,
} from '@/lib/auth-cookie-names';
import { readCookieFromHeader } from '@/lib/parse-cookie-header';

export { ACCESS_COOKIE, REFRESH_COOKIE, LEGACY_ACCESS_COOKIE };

/** Match Set-Cookie `secure` to the actual request (Vercel sets VERCEL=1; avoid Secure cookies on plain HTTP dev). */
export function cookieShouldBeSecure(request?: NextRequest): boolean {
  if (process.env.COOKIE_SECURE === 'false') return false;
  if (process.env.VERCEL === '1') return true;
  const proto = request?.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (proto === 'https') return true;
  return process.env.NODE_ENV === 'production';
}

/**
 * Raw `Cookie` header first: some Vercel/Next runtimes expose an incomplete parsed jar
 * on `NextRequest.cookies` while the header still contains `at_access` / `at_refresh`.
 */
export function getAccessTokenFromRequest(request: NextRequest): string | undefined {
  const raw = request.headers.get('cookie');
  const fromHeader =
    readCookieFromHeader(raw, ACCESS_COOKIE) ??
    readCookieFromHeader(raw, LEGACY_ACCESS_COOKIE);
  if (fromHeader) return fromHeader.trim();
  const parsed =
    request.cookies.get(ACCESS_COOKIE)?.value ??
    request.cookies.get(LEGACY_ACCESS_COOKIE)?.value;
  return parsed?.trim();
}

export function getRefreshTokenFromRequest(request: NextRequest): string | undefined {
  const raw = request.headers.get('cookie');
  const fromHeader = readCookieFromHeader(raw, REFRESH_COOKIE);
  if (fromHeader) return fromHeader.trim();
  return request.cookies.get(REFRESH_COOKIE)?.value?.trim();
}

/**
 * Prefer the incoming `NextRequest` cookie jar first. In some App Router + Vercel
 * setups, `cookies()` from `next/headers` can be empty in route handlers even when
 * the browser sent `Cookie` — which breaks the BFF (no `Authorization` → 401).
 */
export async function getAccessTokenFromRequestAsync(
  request: NextRequest,
): Promise<string | undefined> {
  const fromRequest = getAccessTokenFromRequest(request);
  if (fromRequest) return fromRequest;
  try {
    const jar = await cookies();
    return (
      jar.get(ACCESS_COOKIE)?.value ??
      jar.get(LEGACY_ACCESS_COOKIE)?.value ??
      undefined
    );
  } catch {
    return undefined;
  }
}

export async function getRefreshTokenFromRequestAsync(
  request: NextRequest,
): Promise<string | undefined> {
  const fromRequest = getRefreshTokenFromRequest(request);
  if (fromRequest) return fromRequest;
  try {
    const jar = await cookies();
    return jar.get(REFRESH_COOKIE)?.value ?? undefined;
  } catch {
    return undefined;
  }
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

/** `none` + `Secure` helps browsers attach cookies reliably on full reloads (e.g. Vercel + PWA). */
export function authCookieSameSite(secure: boolean): 'none' | 'lax' {
  return secure ? 'none' : 'lax';
}

export function attachAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
  request?: NextRequest,
) {
  const secure = cookieShouldBeSecure(request);
  const sameSite = authCookieSameSite(secure);
  const accessMax = jwtRemainingSeconds(accessToken);
  res.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    path: '/',
    sameSite,
    secure,
    maxAge: accessMax,
  });
  /** Must match backend `JWT_REFRESH_EXPIRATION` (default 90d in auth.service). */
  const refreshMaxAgeSec = 60 * 60 * 24 * 90;
  res.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    path: '/',
    sameSite,
    secure,
    maxAge: refreshMaxAgeSec,
  });
}

export function clearAuthCookies(res: NextResponse, request?: NextRequest) {
  const secure = cookieShouldBeSecure(request);
  const sameSite = authCookieSameSite(secure);
  const empty = { path: '/', maxAge: 0, sameSite, secure };
  res.cookies.set(ACCESS_COOKIE, '', empty);
  res.cookies.set(REFRESH_COOKIE, '', empty);
  res.cookies.set(LEGACY_ACCESS_COOKIE, '', empty);
}
