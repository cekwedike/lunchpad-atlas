import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/resources', '/discussions', '/leaderboard', '/quiz'];

// Routes that are only for unauthenticated users
const authRoutes = ['/login'];

// Guest mode allowed routes (limited functionality)
const guestAllowedRoutes = ['/dashboard/fellow', '/resources', '/leaderboard', '/about'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get authentication tokens
  const accessToken = request.cookies.get('accessToken')?.value;
  const isGuestMode = request.cookies.get('isGuestMode')?.value === 'true';
  
  // Check if trying to access protected route
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isGuestAllowed = guestAllowedRoutes.some(route => pathname.startsWith(route));
  
  // Redirect authenticated users away from auth pages
  if (isAuthRoute && accessToken) {
    return NextResponse.redirect(new URL('/dashboard/fellow', request.url));
  }
  
  // Handle protected routes
  if (isProtectedRoute) {
    // Allow guest mode for specific routes
    if (isGuestMode && isGuestAllowed) {
      return NextResponse.next();
    }
    
    // Require authentication
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  return NextResponse.next();
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
