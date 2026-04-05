import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Socket.io cannot attach HttpOnly cookies on a cross-origin handshake to Render.
 * Returns the access JWT once for the handshake (same-origin fetch only).
 */
export async function GET(request: NextRequest) {
  const token = getAccessTokenFromRequest(request) ?? null;
  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }
  return NextResponse.json({ token });
}
