import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  getAccessTokenFromRequestAsync,
  getRefreshTokenFromRequestAsync,
} from '@/lib/auth-bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Vary: 'Cookie',
} as const;

/**
 * Lightweight session probe: never 401. Lets the client align Zustand with HttpOnly cookies
 * before calling refresh (avoids refresh 401 + x-atlas-refresh-cookie: absent when cookies are gone).
 */
export async function GET(request: NextRequest) {
  const [refresh, access] = await Promise.all([
    getRefreshTokenFromRequestAsync(request),
    getAccessTokenFromRequestAsync(request),
  ]);

  return NextResponse.json(
    {
      hasRefreshCookie: Boolean(refresh?.length),
      hasAccessCookie: Boolean(access?.length),
    },
    { headers: NO_STORE },
  );
}
