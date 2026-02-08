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
import { UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers: Map<string, string> = new Map(); // socketId -> userId

  constructor(private chatService: ChatService) {}

  // ==================== CONNECTION HANDLERS ====================

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract userId from auth token in handshake
      const token = client.handshake.auth.token;
      
      // TODO: Validate JWT token and extract userId
      // For now, we'll expect userId to be passed directly
      const userId = client.handshake.auth.userId;
      
      if (!userId) {
        client.disconnect();
        return;
      }

      client.userId = userId;
      this.connectedUsers.set(client.id, userId);

      // Get user's cohort and join cohort room
      const user = await this.chatService['prisma'].user.findUnique({
        where: { id: userId },
        select: { cohortId: true, role: true },
      });

      if (user?.cohortId) {
        client.join(`cohort:${user.cohortId}`);
      }

      console.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.connectedUsers.get(client.id);
    this.connectedUsers.delete(client.id);
    console.log(`Client disconnected: ${client.id} (User: ${userId})`);
  }

  // ==================== MESSAGE HANDLERS ====================

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @MessageBody() data: { channelId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = client.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Verify user has access to channel
      const channel = await this.chatService.getChannelById(data.channelId);
      const user = await this.chatService['prisma'].user.findUnique({
        where: { id: userId },
        select: { cohortId: true, role: true },
      });

      if (user?.role !== 'ADMIN' && user?.cohortId !== channel.cohortId) {
        throw new Error('Access denied to this channel');
      }

      // Join channel room
      client.join(`channel:${data.channelId}`);
      
      return {
        success: true,
        message: `Joined channel: ${channel.name}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @SubscribeMessage('leave_channel')
  async handleLeaveChannel(
    @MessageBody() data: { channelId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.leave(`channel:${data.channelId}`);
    return {
      success: true,
      message: 'Left channel',
    };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() data: CreateMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = client.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Create message via service
      const message = await this.chatService.createMessage(data, userId);

      // Get user details for broadcast
      const user = await this.chatService['prisma'].user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      // Broadcast message to all users in the channel
      this.server.to(`channel:${data.channelId}`).emit('new_message', {
        id: message.id,
        channelId: message.channelId,
        userId: message.userId,
        content: message.content,
        createdAt: message.createdAt,
        user,
      });

      return {
        success: true,
        message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const userId = client.userId;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const message = await this.chatService.deleteMessage(data.messageId, userId);

      // Broadcast deletion to channel
      this.server.to(`channel:${message.channelId}`).emit('message_deleted', {
        messageId: data.messageId,
        channelId: message.channelId,
      });

      return {
        success: true,
        message: 'Message deleted',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { channelId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;
    if (!userId) return;

    // Broadcast typing indicator to channel (excluding sender)
    client.to(`channel:${data.channelId}`).emit('user_typing', {
      userId,
      channelId: data.channelId,
    });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { channelId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const userId = client.userId;
    if (!userId) return;

    // Broadcast stop typing to channel
    client.to(`channel:${data.channelId}`).emit('user_stopped_typing', {
      userId,
      channelId: data.channelId,
    });
  }
}
