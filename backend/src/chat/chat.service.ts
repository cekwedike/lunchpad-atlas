import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChannelType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // ==================== CHANNELS ====================

  async createChannel(createChannelDto: CreateChannelDto) {
    return this.prisma.channel.create({
      data: createChannelDto,
    });
  }

  async getCohortChannels(cohortId: string) {
    return this.prisma.channel.findMany({
      where: {
        cohortId,
        isArchived: false,
      },
      orderBy: [
        { type: 'asc' },
        { createdAt: 'asc' },
      ],
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
      throw new ForbiddenException('Only admins and facilitators can archive channels');
    }

    return this.prisma.channel.update({
      where: { id: channelId },
      data: { isArchived: true },
    });
  }

  // ==================== MESSAGES ====================

  async createMessage(createMessageDto: CreateMessageDto, userId: string) {
    // Verify channel exists
    const channel = await this.getChannelById(createMessageDto.channelId);

    // Verify user has access to this cohort
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true },
    });

    if (user?.cohortId !== channel.cohortId) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    // Create message
    const message = await this.prisma.chatMessage.create({
      data: {
        channelId: createMessageDto.channelId,
        userId,
        content: createMessageDto.content,
      },
      include: {
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
      select: { cohortId: true },
    });

    if (user?.cohortId !== channel.cohortId) {
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
      select: {
        id: true,
        channelId: true,
        userId: true,
        content: true,
        isDeleted: true,
        isFlagged: true,
        createdAt: true,
        updatedAt: true,
      },
    });
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
      throw new ForbiddenException('You do not have permission to delete this message');
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
      throw new ForbiddenException('Only admins and facilitators can flag messages');
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
}
