/**
 * Coalesce concurrent POST /api/auth/refresh calls into one in-flight request.
 * Parallel 401s (many queries) + AuthContext bootstrap used to exceed Nest's refresh throttle (429).
 */
let inFlight: Promise<Response> | null = null;

export function fetchBffRefresh(): Promise<Response> {
  if (typeof window === 'undefined') {
    return Promise.resolve(new Response(null, { status: 204 }));
  }
  if (!inFlight) {
    inFlight = fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
