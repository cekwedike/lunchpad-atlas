import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const protectedRoutes = ['/dashboard', '/profile', '/resources', '/discussions', '/leaderboard', '/quiz'];
const authRoutes = ['/login'];

function decodeJwtPayloadUnverified(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function roleFromAccessToken(token: string): Promise<{ role: string; verified: boolean } | null> {
  const secret = process.env.JWT_SECRET;
  if (secret) {
    try {
      const key = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, key);
      const role = (payload.role as string) ?? 'FELLOW';
      return { role, verified: true };
    } catch {
      return null;
    }
  }
  const payload = decodeJwtPayloadUnverified(token);
  if (!payload) return null;
  return { role: (payload.role as string) ?? 'FELLOW', verified: false };
}

function getDashboardForRole(role: string): string {
  if (role === 'ADMIN') return '/dashboard/admin';
  if (role === 'FACILITATOR') return '/dashboard/facilitator';
  if (role === 'GUEST_FACILITATOR') return '/dashboard/guest-facilitator';
  return '/dashboard/fellow';
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && accessToken) {
    const parsed = await roleFromAccessToken(accessToken);
    if (parsed === null) {
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.set('accessToken', '', { path: '/', maxAge: 0 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }
    const response = NextResponse.redirect(
      new URL(getDashboardForRole(parsed.role), request.url),
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  if (isProtectedRoute && accessToken && process.env.JWT_SECRET) {
    const parsed = await roleFromAccessToken(accessToken);
    if (parsed === null) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.set('accessToken', '', { path: '/', maxAge: 0 });
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
