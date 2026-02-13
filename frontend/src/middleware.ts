import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/resources', '/discussions', '/leaderboard', '/quiz'];

// Routes that are only for unauthenticated users
const authRoutes = ['/login'];

/** Decode JWT payload without verifying the signature (safe on edge — verification happens on the backend API) */
function decodeJwtPayload(token: string): Record<string, any> | null {
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

function getDashboardForRole(role: string): string {
  if (role === 'ADMIN') return '/dashboard/admin';
  if (role === 'FACILITATOR') return '/dashboard/facilitator';
  return '/dashboard/fellow';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const accessToken = request.cookies.get('accessToken')?.value;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Redirect authenticated users away from login to their role-specific dashboard
  if (isAuthRoute && accessToken) {
    const payload = decodeJwtPayload(accessToken);
    const role = payload?.role ?? 'FELLOW';
    const response = NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  // Require authentication for protected routes
  if (isProtectedRoute && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
