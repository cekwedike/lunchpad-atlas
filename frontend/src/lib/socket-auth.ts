export async function fetchSocketAuthToken(): Promise<string | null> {
  const r = await fetch('/api/auth/socket-token', { credentials: 'include' });
  if (!r.ok) return null;
  const data = (await r.json()) as { token?: string | null };
  return data.token ?? null;
}
