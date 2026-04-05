import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-bff';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res, request);
  return res;
}
