/** Client-side probe for HttpOnly auth cookies (always 200, never 401). */
export async function getBffSessionSnapshot(): Promise<{
  hasRefreshCookie: boolean;
  hasAccessCookie: boolean;
}> {
  const r = await fetch('/api/auth/session', {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = (await r.json().catch(() => ({}))) as {
    hasRefreshCookie?: boolean;
    hasAccessCookie?: boolean;
  };
  return {
    hasRefreshCookie: Boolean(data.hasRefreshCookie),
    hasAccessCookie: Boolean(data.hasAccessCookie),
  };
}
