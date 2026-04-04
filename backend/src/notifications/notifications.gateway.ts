import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { validateWsToken } from '../common/ws-auth.util';
import { getWebsocketCorsOrigin } from '../common/ws-cors.config';
import { PrismaService } from '../prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: getWebsocketCorsOrigin(),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // socketId -> userId

  constructor(private prisma: PrismaService) {}

  // ==================== CONNECTION HANDLERS ====================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const userId = await validateWsToken(client, this.prisma);

      if (!userId) {
        client.disconnect();
        return;
      }

      client.userId = userId;
      this.connectedUsers.set(client.id, userId);

      // Join user's personal room
      client.join(`user:${userId}`);

      console.log(
        `Notification client connected: ${client.id} (User: ${userId})`,
      );
    } catch (error) {
      console.error('Notification connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);
    console.log(
      `Notification client disconnected: ${client.id} (User: ${userId})`,
    );
  }

  // ==================== BROADCAST METHODS ====================

  /**
   * Send a notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('new_notification', notification);
  }

  /**
   * Broadcast unread count update to a user
   */
  sendUnreadCountUpdate(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unread_count_update', { count });
  }

  /**
   * Broadcast notification to all users in a cohort
   */
  sendCohortNotification(cohortId: string, notification: any) {
    this.server.to(`cohort:${cohortId}`).emit('new_notification', notification);
  }
}
