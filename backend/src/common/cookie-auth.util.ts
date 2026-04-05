/** Cookie names must match frontend `auth-cookie-names.ts`. */
const ACCESS_COOKIE = 'at_access';
const REFRESH_COOKIE = 'at_refresh';
const LEGACY_ACCESS_COOKIE = 'accessToken';

export function readCookieValue(
  cookieHeader: string | undefined,
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

export function readAccessTokenFromCookieHeader(
  cookieHeader: string | undefined,
): string | undefined {
  const v =
    readCookieValue(cookieHeader, ACCESS_COOKIE)?.trim() ??
    readCookieValue(cookieHeader, LEGACY_ACCESS_COOKIE)?.trim();
  return v || undefined;
}

export function readRefreshTokenFromCookieHeader(
  cookieHeader: string | undefined,
): string | undefined {
  const v = readCookieValue(cookieHeader, REFRESH_COOKIE)?.trim();
  return v || undefined;
}
