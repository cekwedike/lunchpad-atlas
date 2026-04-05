import type { Request, Response, NextFunction } from 'express';
import { readAccessTokenFromCookieHeader } from '../cookie-auth.util';

/**
 * Vercel BFF may fail to attach `Authorization` while still proxying `Cookie`.
 * Populate `Authorization: Bearer …` from `at_access` / legacy `accessToken` when missing.
 */
export function cookieBearerBridgeMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const existing = req.headers.authorization;
  if (
    typeof existing === 'string' &&
    existing.toLowerCase().startsWith('bearer ')
  ) {
    next();
    return;
  }
  const token = readAccessTokenFromCookieHeader(req.headers.cookie);
  if (token) {
    req.headers.authorization = `Bearer ${token}`;
  }
  next();
}
