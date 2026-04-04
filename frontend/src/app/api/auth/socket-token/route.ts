import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  LEGACY_ACCESS_COOKIE,
} from '@/lib/auth-cookie-names';

export const runtime = 'nodejs';

/**
 * Socket.io cannot attach HttpOnly cookies on a cross-origin handshake to Render.
 * Returns the access JWT once for the handshake (same-origin fetch only).
 */
export async function GET(request: NextRequest) {
  const token =
    request.cookies.get(ACCESS_COOKIE)?.value ??
    request.cookies.get(LEGACY_ACCESS_COOKIE)?.value ??
    null;
  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }
  return NextResponse.json({ token });
}
