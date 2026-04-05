import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getInternalApiBase } from '@/lib/internal-api-url';
import { getAccessTokenFromRequestAsync } from '@/lib/auth-bff';

export const runtime = 'nodejs';

const SKIP_HEADERS = new Set([
  'connection',
  'host',
  'content-length',
  'transfer-encoding',
]);

function isLoopbackApiBase(base: string): boolean {
  try {
    const host = new URL(base).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

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

  const deployIsRemote =
    process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  if (deployIsRemote && isLoopbackApiBase(base)) {
    return NextResponse.json(
      {
        statusCode: 503,
        message: 'API base URL is not configured for this deployment',
        hint: 'Set INTERNAL_API_URL on Vercel to your backend base including /api/v1 (e.g. https://your-service.onrender.com/api/v1). See DEPLOYMENT.md.',
      },
      { status: 503 },
    );
  }

  const access = await getAccessTokenFromRequestAsync(request);
  const hadIncomingAuthorization = Boolean(
    request.headers.get('authorization'),
  );

  let bffJwtVerify: 'ok' | 'fail' | 'skip' = 'skip';
  if (process.env.ATLAS_AUTH_DEBUG === 'true') {
    if (access && process.env.JWT_SECRET) {
      try {
        await jwtVerify(access, new TextEncoder().encode(process.env.JWT_SECRET));
        bffJwtVerify = 'ok';
      } catch {
        bffJwtVerify = 'fail';
      }
    }
  }

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    // Never forward browser Authorization — we only trust HttpOnly cookies turned into Bearer here.
    if (SKIP_HEADERS.has(k) || k === 'cookie' || k === 'authorization') return;
    headers.set(key, value);
  });

  if (access) {
    headers.set('Authorization', `Bearer ${access}`);
  }

  const hasBody = !['GET', 'HEAD'].includes(method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      {
        statusCode: 502,
        message: 'Upstream API unreachable',
        hint: 'Confirm the backend is running and INTERNAL_API_URL points to it. Render free tier sleeps until the first request.',
      },
      { status: 502 },
    );
  }

  const outHeaders = new Headers(upstream.headers);
  outHeaders.delete('set-cookie');
  // Node fetch may transparently decompress the body while upstream still sent Content-Encoding.
  // Forwarding those headers causes browsers to fail with net::ERR_CONTENT_DECODING_FAILED.
  outHeaders.delete('content-encoding');
  outHeaders.delete('content-length');
  outHeaders.delete('transfer-encoding');

  outHeaders.set('x-atlas-proxy-access', access ? 'present' : 'absent');
  if (process.env.ATLAS_AUTH_DEBUG === 'true') {
    try {
      outHeaders.set('x-atlas-api-host', new URL(base).hostname);
    } catch {
      outHeaders.set('x-atlas-api-host', 'invalid-base');
    }
    outHeaders.set('x-atlas-bff-jwt', bffJwtVerify);
    if (access) {
      outHeaders.set('x-atlas-access-len', String(access.length));
    }
    outHeaders.set('x-atlas-target-path', path.join('/'));
  }

  let apiHost = '';
  try {
    apiHost = new URL(base).hostname;
  } catch {
    apiHost = 'invalid';
  }

  if (process.env.ATLAS_AUTH_DEBUG === 'true') {
    // #region agent log
    fetch('http://127.0.0.1:7701/ingest/e81e2ca9-9269-46ee-8b1d-7417bde9f25b', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '14ec07',
      },
      body: JSON.stringify({
        sessionId: '14ec07',
        hypothesisId: 'H5-H8',
        location: 'api/proxy/[...path]/route.ts:proxyToBackend',
        message: 'proxy upstream meta',
        data: {
          path: path.join('/'),
          upstreamStatus: upstream.status,
          hadContentEncoding: Boolean(upstream.headers.get('content-encoding')),
          hadContentLength: Boolean(upstream.headers.get('content-length')),
          hasAccessCookie: Boolean(access),
          accessLen: access?.length ?? 0,
          hadIncomingAuthorization,
          bffJwtVerify,
          apiHost,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }

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
