/**
 * WebSocket CORS must match REST CORS in main.ts so Next.js (3000/3001) and
 * Vite (5173) behave the same for sockets and HTTP in development.
 */
export function getWebsocketCorsOrigin(): string | string[] | boolean {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return process.env.FRONTEND_URL || false;
  }
  const origins = Array.from(
    new Set(
      [
        process.env.FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
      ].filter((o): o is string => Boolean(o)),
    ),
  );
  return origins.length > 0 ? origins : 'http://localhost:5173';
}
