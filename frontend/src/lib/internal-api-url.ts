/**
 * Server-only: base URL for the Nest API (must include /api/v1).
 * Prefer INTERNAL_API_URL on Vercel so the value is not required to be "public".
 */
export function getInternalApiBase(): string {
  const raw =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000/api/v1';
  return raw.replace(/\/$/, '');
}
