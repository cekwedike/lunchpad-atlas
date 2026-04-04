import { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma.service';

/**
 * Validates JWT and account state; returns userId or null.
 */
export async function validateWsToken(
  client: Socket,
  prisma: PrismaService,
): Promise<string | null> {
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
    const sub = payload.sub;
    if (!sub) return null;

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: {
        isSuspended: true,
        guestAccessExpiresAt: true,
        role: true,
      },
    });
    if (!user) return null;
    if (user.isSuspended) return null;
    if (
      user.role === 'GUEST_FACILITATOR' &&
      user.guestAccessExpiresAt &&
      new Date() > user.guestAccessExpiresAt
    ) {
      return null;
    }

    return sub;
  } catch {
    return null;
  }
}
