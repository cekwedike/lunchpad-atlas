import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

/**
 * Validates JWT token from WebSocket handshake and extracts userId.
 * Returns null if token is missing/invalid.
 */
export function validateWsToken(client: Socket): string | null {
  try {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not configured — rejecting WebSocket connection');
      return null;
    }

    const payload = jwt.verify(token, secret) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
