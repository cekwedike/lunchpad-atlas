import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  cohortId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/discussions',
})
export class DiscussionsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, { userId: string; cohortId?: string }> =
    new Map();

  constructor(private prisma: PrismaService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const userId =
        client.handshake.auth.userId || client.handshake.query.userId;

      if (!userId) {
        console.log('Connection rejected: No userId provided');
        client.disconnect();
        return;
      }

      // Get user's cohort
      const user = await this.prisma.user.findUnique({
        where: { id: userId as string },
        select: { cohortId: true },
      });

      if (user?.cohortId) {
        client.userId = userId as string;
        client.cohortId = user.cohortId;
        this.connectedUsers.set(client.id, {
          userId: userId as string,
          cohortId: user.cohortId,
        });

        // Join cohort room for discussion updates
        client.join(`cohort:${user.cohortId}`);
        client.join(`user:${userId}`);

        console.log(
          `Discussion client connected: ${client.id} (User: ${userId}, Cohort: ${user.cohortId})`,
        );
      } else {
        client.disconnect();
      }
    } catch (error) {
      console.error('Discussion connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userInfo = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);
    console.log(
      `Discussion client disconnected: ${client.id} (User: ${userInfo?.userId})`,
    );
  }

  // ==================== BROADCAST METHODS ====================

  broadcastNewDiscussion(discussion: any) {
    // Broadcast to all users in the cohort
    if (discussion.cohortId) {
      this.server
        .to(`cohort:${discussion.cohortId}`)
        .emit('discussion:new', discussion);
    }
  }

  broadcastDiscussionUpdate(discussion: any) {
    if (discussion.cohortId) {
      this.server
        .to(`cohort:${discussion.cohortId}`)
        .emit('discussion:updated', discussion);
    }
  }

  broadcastNewComment(comment: any, discussionId: string, cohortId: string) {
    this.server.to(`cohort:${cohortId}`).emit('discussion:new_comment', {
      discussionId,
      comment,
    });
  }

  broadcastCommentDeleted(discussionId: string, commentId: string, cohortId: string) {
    this.server.to(`cohort:${cohortId}`).emit('discussion:comment_deleted', {
      discussionId,
      commentId,
    });
  }

  broadcastDiscussionDeleted(discussionId: string, cohortId: string) {
    this.server
      .to(`cohort:${cohortId}`)
      .emit('discussion:deleted', { discussionId });
  }

  // Notify specific user
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ==================== SUBSCRIPTION HANDLERS ====================

  @SubscribeMessage('discussion:subscribe')
  async handleSubscribeDiscussion(
    @MessageBody() data: { discussionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.join(`discussion:${data.discussionId}`);
    return {
      success: true,
      message: `Subscribed to discussion ${data.discussionId}`,
    };
  }

  @SubscribeMessage('discussion:unsubscribe')
  async handleUnsubscribeDiscussion(
    @MessageBody() data: { discussionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(`discussion:${data.discussionId}`);
    return {
      success: true,
      message: `Unsubscribed from discussion ${data.discussionId}`,
    };
  }

  @SubscribeMessage('discussion:typing')
  async handleTyping(
    @MessageBody() data: { discussionId: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;
    if (!userId) return;

    // Broadcast typing status to other users viewing the same discussion
    client
      .to(`discussion:${data.discussionId}`)
      .emit('discussion:user_typing', {
        userId,
        discussionId: data.discussionId,
        isTyping: data.isTyping,
      });
  }
}
