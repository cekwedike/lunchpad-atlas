import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { validateWsToken } from '../common/ws-auth.util';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : false),
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

  // ==================== CONNECTION HANDLERS ====================

  handleConnection(client: AuthenticatedSocket) {
    try {
      const userId = validateWsToken(client);

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
