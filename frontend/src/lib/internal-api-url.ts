/**
 * Server-only: base URL for the Nest API (must include /api/v1).
 * Prefer INTERNAL_API_URL on Vercel (runtime env; not inlined at build like NEXT_PUBLIC_*).
 */
function pickApiBaseEnv(): string {
  const candidates = [process.env.INTERNAL_API_URL, process.env.NEXT_PUBLIC_API_URL];
  for (const v of candidates) {
    if (!v) continue;
    const t = v.trim().replace(/^["']|["']$/g, '');
    if (t) return t;
  }
  return 'http://localhost:4000/api/v1';
}

export function getInternalApiBase(): string {
  const raw = pickApiBaseEnv();
  const trimmed = raw.replace(/\/$/, '');
  try {
    const u = new URL(trimmed);
    const path = (u.pathname.replace(/\/$/, '') || '/') as string;
    if (path === '/') {
      u.pathname = '/api/v1';
      return u.toString().replace(/\/$/, '');
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
