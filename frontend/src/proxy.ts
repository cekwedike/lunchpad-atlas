import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  LEGACY_ACCESS_COOKIE,
} from '@/lib/auth-cookie-names';
import { readCookieFromHeader } from '@/lib/parse-cookie-header';

const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/resources',
  '/discussions',
  '/leaderboard',
  '/quiz',
];
const authRoutes = ['/login'];

function decodeJwtPayloadUnverified(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * When JWT_SECRET is set (production), only a signature-valid token may pass the edge.
 * Unverified decode is used only when no secret is configured (local convenience).
 */
async function roleFromToken(token: string): Promise<string | null> {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
      );
      const role = payload.role as string | undefined;
      return typeof role === 'string' ? role : 'FELLOW';
    } catch {
      return null;
    }
  }

  const payload = decodeJwtPayloadUnverified(token);
  if (!payload) return null;
  const exp = payload.exp;
  if (typeof exp === 'number' && exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  const role = payload.role;
  return typeof role === 'string' ? role : 'FELLOW';
}

function getDashboardForRole(role: string): string {
  if (role === 'ADMIN') return '/dashboard/admin';
  if (role === 'FACILITATOR') return '/dashboard/facilitator';
  if (role === 'GUEST_FACILITATOR') return '/dashboard/guest-facilitator';
  return '/dashboard/fellow';
}

function redirectToLogin(
  request: NextRequest,
  pathname: string,
  opts?: { session?: string },
) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  if (opts?.session) {
    loginUrl.searchParams.set('session', opts.session);
  }
  const response = NextResponse.redirect(loginUrl);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function hasRefreshCookie(request: NextRequest): boolean {
  const raw = request.headers.get('cookie');
  const fromHeader = readCookieFromHeader(raw, REFRESH_COOKIE)?.trim();
  const fromJar = request.cookies.get(REFRESH_COOKIE)?.value?.trim();
  return Boolean(fromHeader || fromJar);
}

function passThrough() {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = (
    request.cookies.get(ACCESS_COOKIE)?.value ??
    request.cookies.get(LEGACY_ACCESS_COOKIE)?.value ??
    readCookieFromHeader(request.headers.get('cookie'), ACCESS_COOKIE) ??
    readCookieFromHeader(request.headers.get('cookie'), LEGACY_ACCESS_COOKIE)
  )?.trim();

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && accessToken) {
    const role = await roleFromToken(accessToken);
    if (role) {
      const response = NextResponse.redirect(
        new URL(getDashboardForRole(role), request.url),
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
    // Cookie present but unreadable — still show login; BFF/API own validation (do not clear cookies).
  }

  if (isProtectedRoute) {
    const canRefresh = hasRefreshCookie(request);
    // Access JWT is short-lived (~JWT_EXPIRATION). If it is missing/expired but the user
    // still has a refresh cookie, let the page load so the client can POST /api/auth/refresh.
    if (!accessToken) {
      if (canRefresh) return passThrough();
      return redirectToLogin(request, pathname);
    }
    const role = await roleFromToken(accessToken);
    if (!role) {
      if (canRefresh) return passThrough();
      return redirectToLogin(request, pathname, { session: 'expired' });
    }
  }

  return passThrough();
}

export const config = {
  matcher: [
    // Skip /api/* — auth + BFF are plain route handlers; avoids any edge interaction with API cookies.
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
