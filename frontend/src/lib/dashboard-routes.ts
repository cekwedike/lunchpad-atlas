/** Dashboard URL for a backend user role (matches Next.js app route segments). */
export function getDashboardForRole(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard/admin';
    case 'FACILITATOR':
      return '/dashboard/facilitator';
    case 'GUEST_FACILITATOR':
      return '/dashboard/guest-facilitator';
    default:
      return '/dashboard/fellow';
  }
}

export const PROTECTED_ROUTE_PREFIXES = [
  '/dashboard',
  '/profile',
  '/resources',
  '/discussions',
  '/leaderboard',
  '/quiz',
] as const;

export function isProtectedRoutePath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Human-readable portal name for “use the X portal” copy. */
export function getPortalLabelForRole(role: string): string {
  switch (role) {
    case 'FELLOW':
      return 'Fellow';
    case 'FACILITATOR':
      return 'Facilitator';
    case 'GUEST_FACILITATOR':
      return 'Guest Facilitator';
    case 'ADMIN':
      return 'Administrator';
    default:
      return 'correct';
  }
}
