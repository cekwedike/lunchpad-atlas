import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChannelType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ==================== CHANNELS ====================

  async createChannel(createChannelDto: CreateChannelDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, cohortId: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (
      user.role === 'FACILITATOR' &&
      user.cohortId !== createChannelDto.cohortId
    ) {
      throw new ForbiddenException(
        'Facilitators can only create channels for their cohort',
      );
    }

    const channel = await this.prisma.channel.create({
      data: createChannelDto,
    });

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: createChannelDto.cohortId },
      select: { id: true, name: true, facilitatorId: true },
    });

    if (cohort) {
      const recipients = await this.getChatNotificationRecipients(
        cohort.id,
        cohort.facilitatorId,
        userId,
      );

      if (recipients.length > 0) {
        await this.notificationsService.notifyChatRoomCreated(
          recipients,
          channel.name,
          cohort.name,
          channel.id,
        );
      }
    }

    return channel;
  }

  async getCohortChannels(cohortId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, cohortId: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.role !== 'ADMIN' && user.cohortId !== cohortId) {
      throw new ForbiddenException('You do not have access to this cohort');
    }

    return this.prisma.channel.findMany({
      where: {
        cohortId,
        isArchived: false,
      },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
      include: {
        cohort: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getAllChannels() {
    return this.prisma.channel.findMany({
      where: {
        isArchived: false,
      },
      orderBy: [{ cohortId: 'asc' }, { type: 'asc' }, { createdAt: 'asc' }],
      include: {
        cohort: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getChannelById(channelId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${channelId} not found`);
    }

    return channel;
  }

  async archiveChannel(channelId: string, userId: string) {
    // Verify user is admin or facilitator
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'FACILITATOR')) {
      throw new ForbiddenException(
        'Only admins and facilitators can archive channels',
      );
    }

    if (user.role === 'FACILITATOR') {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        select: { cohortId: true },
      });

      if (!channel || channel.cohortId !== user.cohortId) {
        throw new ForbiddenException(
          'Facilitators can only archive channels for their cohort',
        );
      }
    }

    return this.prisma.channel.update({
      where: { id: channelId },
      data: { isArchived: true },
    });
  }

  async deleteChannel(channelId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, cohortId: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'FACILITATOR')) {
      throw new ForbiddenException(
        'Only admins and facilitators can delete channels',
      );
    }

    if (user.role === 'FACILITATOR') {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        select: { cohortId: true },
      });

      if (!channel || channel.cohortId !== user.cohortId) {
        throw new ForbiddenException(
          'Facilitators can only delete channels for their cohort',
        );
      }
    }

    await this.prisma.chatMessage.deleteMany({
      where: { channelId },
    });

    return this.prisma.channel.delete({
      where: { id: channelId },
    });
  }

  // ==================== MESSAGES ====================

  async createMessage(createMessageDto: CreateMessageDto, userId: string) {
    // Verify channel exists
    const channel = await this.getChannelById(createMessageDto.channelId);

    // Verify user has access to this cohort
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true, role: true },
    });

    if (user?.role !== 'ADMIN' && user?.cohortId !== channel.cohortId) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    if (
      channel.isLocked &&
      user?.role !== 'ADMIN' &&
      user?.role !== 'FACILITATOR'
    ) {
      throw new ForbiddenException(
        'This chat room is locked for announcements only',
      );
    }

    // Create message
    const message = await this.prisma.chatMessage.create({
      data: {
        channelId: createMessageDto.channelId,
        userId,
        content: createMessageDto.content,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        channel: {
          select: {
            id: true,
            name: true,
            cohortId: true,
          },
        },
      },
    });

    // Log engagement event
    await this.prisma.engagementEvent.create({
      data: {
        userId,
        eventType: 'CHAT_MESSAGE',
        metadata: {
          channelId: createMessageDto.channelId,
          messageId: message.id,
        },
      },
    });

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: message.channel.cohortId },
      select: { facilitatorId: true },
    });

    const recipients = await this.getChatNotificationRecipients(
      message.channel.cohortId,
      cohort?.facilitatorId || null,
      userId,
    );

    if (recipients.length > 0) {
      const senderName =
        `${message.user?.firstName || ''} ${message.user?.lastName || ''}`.trim() ||
        'Someone';
      const preview =
        createMessageDto.content.length > 120
          ? `${createMessageDto.content.slice(0, 117)}...`
          : createMessageDto.content;

      await this.notificationsService.notifyBulkChatMessage(
        recipients,
        senderName,
        message.channel.name,
        preview,
        message.channel.id,
      );
    }

    return message;
  }

  async getChannelMessages(
    channelId: string,
    userId: string,
    limit: number = 50,
    before?: string,
  ) {
    // Verify channel exists and user has access
    const channel = await this.getChannelById(channelId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true, role: true },
    });

    if (user?.role !== 'ADMIN' && user?.cohortId !== channel.cohortId) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    // Build query conditions
    const whereConditions: any = {
      channelId,
      isDeleted: false,
    };

    if (before) {
      whereConditions.createdAt = {
        lt: new Date(before),
      };
    }

    return this.prisma.chatMessage.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });
  }

  async toggleChannelLock(channelId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, cohortId: true },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'FACILITATOR')) {
      throw new ForbiddenException(
        'Only admins and facilitators can lock channels',
      );
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, cohortId: true, isLocked: true, name: true },
    });

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${channelId} not found`);
    }

    if (user.role === 'FACILITATOR' && user.cohortId !== channel.cohortId) {
      throw new ForbiddenException(
        'Facilitators can only lock channels for their cohort',
      );
    }

    const updated = await this.prisma.channel.update({
      where: { id: channelId },
      data: { isLocked: !channel.isLocked },
      include: {
        cohort: { select: { id: true, name: true } },
      },
    });

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: updated.cohortId },
      select: { facilitatorId: true },
    });

    const recipients = await this.getChatNotificationRecipients(
      updated.cohortId,
      cohort?.facilitatorId || null,
      userId,
    );

    if (recipients.length > 0) {
      await this.notificationsService.notifyChatRoomLockUpdated(
        recipients,
        updated.name,
        updated.cohort?.name || 'your cohort',
        updated.id,
        updated.isLocked,
      );
    }

    return updated;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Verify user is message author, admin, or facilitator
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (
      message.userId !== userId &&
      user?.role !== 'ADMIN' &&
      user?.role !== 'FACILITATOR'
    ) {
      throw new ForbiddenException(
        'You do not have permission to delete this message',
      );
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });
  }

  async flagMessage(messageId: string, userId: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Verify user is admin or facilitator
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'FACILITATOR')) {
      throw new ForbiddenException(
        'Only admins and facilitators can flag messages',
      );
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { isFlagged: true },
    });
  }

  // ==================== INITIALIZATION ====================

  async initializeCohortChannels(cohortId: string) {
    // Create default channels for a new cohort
    const channels = [
      {
        cohortId,
        type: ChannelType.COHORT_WIDE,
        name: 'General',
        description: 'General discussion for all cohort members',
      },
      {
        cohortId,
        type: ChannelType.COHORT_WIDE,
        name: 'Help & Questions',
        description: 'Ask questions and get help from peers and facilitators',
      },
    ];

    return Promise.all(
      channels.map((channel) => this.prisma.channel.create({ data: channel })),
    );
  }

  private async getChatNotificationRecipients(
    cohortId: string,
    facilitatorId: string | null,
    excludeUserId: string,
  ): Promise<string[]> {
    const recipients = await this.prisma.user.findMany({
      where: {
        OR: [{ role: 'ADMIN' }, { cohortId }],
        id: { not: excludeUserId },
      },
      select: { id: true },
    });

    const recipientIds = new Set(recipients.map((recipient) => recipient.id));

    if (facilitatorId && facilitatorId !== excludeUserId) {
      recipientIds.add(facilitatorId);
    }

    return Array.from(recipientIds);
  }
}
