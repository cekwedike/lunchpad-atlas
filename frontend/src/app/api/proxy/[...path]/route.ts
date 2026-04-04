import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getInternalApiBase } from '@/lib/internal-api-url';
import {
  ACCESS_COOKIE,
  LEGACY_ACCESS_COOKIE,
} from '@/lib/auth-cookie-names';

export const runtime = 'nodejs';

const SKIP_HEADERS = new Set([
  'connection',
  'host',
  'content-length',
  'transfer-encoding',
]);

async function proxyToBackend(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
  method: string,
) {
  const { path } = await ctx.params;
  if (!path?.length) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const base = getInternalApiBase();
  const url = new URL(request.url);
  const target = `${base}/${path.join('/')}${url.search}`;

  const access =
    request.cookies.get(ACCESS_COOKIE)?.value ??
    request.cookies.get(LEGACY_ACCESS_COOKIE)?.value;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (SKIP_HEADERS.has(k) || k === 'cookie') return;
    headers.set(key, value);
  });

  if (access) {
    headers.set('Authorization', `Bearer ${access}`);
  }

  const hasBody = !['GET', 'HEAD'].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(target, {
    method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    cache: 'no-store',
  });

  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete('set-cookie');
  // Node fetch may transparently decompress the body while upstream still sent Content-Encoding.
  // Forwarding those headers causes browsers to fail with net::ERR_CONTENT_DECODING_FAILED.
  outHeaders.delete('content-encoding');
  outHeaders.delete('content-length');
  outHeaders.delete('transfer-encoding');

  // #region agent log
  fetch('http://127.0.0.1:7701/ingest/e81e2ca9-9269-46ee-8b1d-7417bde9f25b', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '14ec07',
    },
    body: JSON.stringify({
      sessionId: '14ec07',
      hypothesisId: 'H1',
      location: 'api/proxy/[...path]/route.ts:proxyToBackend',
      message: 'upstream response meta (encoding strip applied)',
      data: {
        path: path.join('/'),
        upstreamStatus: upstream.status,
        hadContentEncoding: Boolean(upstream.headers.get('content-encoding')),
        hadContentLength: Boolean(upstream.headers.get('content-length')),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

export function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxyToBackend(request, ctx, 'GET');
}

export function POST(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxyToBackend(request, ctx, 'POST');
}

export function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxyToBackend(request, ctx, 'PUT');
}

export function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxyToBackend(request, ctx, 'PATCH');
}

export function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxyToBackend(request, ctx, 'DELETE');
}

export function HEAD(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxyToBackend(request, ctx, 'HEAD');
}
