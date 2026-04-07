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

  /** Award 2–5 chat points per message with a 10pt daily cap */
  private async awardChatPoints(userId: string, content: string): Promise<void> {
    // Points based on message length: ≥100 chars = 5pts, ≥50 = 3pts, else 2pts
    const pts = content.length >= 100 ? 5 : content.length >= 50 ? 3 : 2;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayChatPoints = await this.prisma.pointsLog.aggregate({
      where: {
        userId,
        eventType: 'CHAT_MESSAGE',
        createdAt: { gte: startOfDay },
      },
      _sum: { points: true },
    });

    const usedToday = todayChatPoints._sum.points ?? 0;
    const remaining = Math.max(0, 10 - usedToday); // 10pt daily cap
    if (remaining <= 0) return;

    const awardPts = Math.min(pts, remaining);

    await this.prisma.pointsLog.create({
      data: { userId, points: awardPts, eventType: 'CHAT_MESSAGE', description: 'Chat engagement' },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { currentMonthPoints: { increment: awardPts } },
    });
  }

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
      select: { id: true, name: true },
    });

    if (cohort) {
      const recipients = await this.getChatNotificationRecipients(
        cohort.id,
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
        type: { not: ChannelType.DIRECT_MESSAGE },
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
        type: { not: ChannelType.DIRECT_MESSAGE },
      },
      orderBy: [{ cohortId: 'asc' }, { type: 'asc' }, { createdAt: 'asc' }],
      include: {
        cohort: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async getUserDirectChannels(userId: string) {
    // Lazy cleanup: remove DMs from cohorts that ended > 6 months ago
    await this.cleanupExpiredDMs();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const allDMs = await this.prisma.channel.findMany({
      where: {
        type: ChannelType.DIRECT_MESSAGE,
        isArchived: false,
      },
      include: {
        cohort: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Admins see all DMs; other users see only their own
    if (user?.role === 'ADMIN') {
      return allDMs;
    }

    return allDMs.filter((channel) => {
      const participants = this.extractDmParticipants(channel.name);
      return participants?.includes(userId);
    });
  }

  private extractDmParticipants(channelName: string): string[] | null {
    const parts = channelName.split('::');
    if (parts.length === 3 && parts[0] === 'dm') {
      return [parts[1], parts[2]];
    }
    return null;
  }

  private async cleanupExpiredDMs() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expiredDMs = await this.prisma.channel.findMany({
      where: {
        type: ChannelType.DIRECT_MESSAGE,
        cohort: { endDate: { lt: sixMonthsAgo } },
      },
      select: { id: true },
    });

    if (expiredDMs.length === 0) return;

    const expiredIds = expiredDMs.map((c) => c.id);
    await this.prisma.chatMessage.deleteMany({ where: { channelId: { in: expiredIds } } });
    await this.prisma.channel.deleteMany({ where: { id: { in: expiredIds } } });
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

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, cohortId: true, name: true },
    });

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${channelId} not found`);
    }

    if (user.role === 'FACILITATOR' && channel.cohortId !== user.cohortId) {
        throw new ForbiddenException(
          'Facilitators can only archive channels for their cohort',
        );
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

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, cohortId: true, name: true },
    });

    if (!channel) {
      throw new NotFoundException(`Channel with ID ${channelId} not found`);
    }

    if (user.role === 'FACILITATOR' && channel.cohortId !== user.cohortId) {
      throw new ForbiddenException(
        'Facilitators can only delete channels for their cohort',
      );
    }

    await this.prisma.chatMessage.deleteMany({
      where: { channelId },
    });

    await this.prisma.channel.delete({
      where: { id: channelId },
    });

    return channel;
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

    // DM check: only participants can send messages; admins cannot send in DMs
    if (channel.type === ChannelType.DIRECT_MESSAGE) {
      const participants = this.extractDmParticipants(channel.name);
      if (!participants || !participants.includes(userId)) {
        throw new ForbiddenException(
          'You are not a participant in this private conversation',
        );
      }
    } else {
      if (user?.role !== 'ADMIN' && user?.cohortId !== channel.cohortId) {
        throw new ForbiddenException('You do not have access to this channel');
      }
    }

    if (
      channel.isLocked &&
      user?.role !== 'ADMIN' &&
      user?.role !== 'FACILITATOR' &&
      user?.role !== 'GUEST_FACILITATOR'
    ) {
      throw new ForbiddenException(
        'This chat room is locked for announcements only',
      );
    }

    if (createMessageDto.parentMessageId) {
      const parent = await this.prisma.chatMessage.findUnique({
        where: { id: createMessageDto.parentMessageId },
        select: { id: true, channelId: true, isDeleted: true },
      });
      if (!parent || parent.isDeleted) {
        throw new NotFoundException('Parent message not found');
      }
      if (parent.channelId !== createMessageDto.channelId) {
        throw new ForbiddenException('Cannot reply across channels');
      }
    }

    // Create message
    const message = await this.prisma.chatMessage.create({
      data: {
        channelId: createMessageDto.channelId,
        userId,
        parentMessageId: createMessageDto.parentMessageId ?? null,
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

    // Mentions + notifications will be handled after schema migration.
    // We keep this logic in-place but guarded via `as any` so the backend still typechecks
    // even if Prisma client hasn't been regenerated yet.
    await this.handleMentionsAfterMessageCreated(message, createMessageDto.content).catch(
      () => undefined,
    );

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

    // Award chat engagement points (2-5 pts per message, 10pt daily cap)
    // Don't award points in DMs — only public/cohort channels
    if (channel.type !== ChannelType.DIRECT_MESSAGE) {
      await this.awardChatPoints(userId, createMessageDto.content).catch(() => undefined);
    }

    const senderName =
      `${message.user?.firstName || ''} ${message.user?.lastName || ''}`.trim() ||
      'Someone';
    const preview =
      createMessageDto.content.length > 120
        ? `${createMessageDto.content.slice(0, 117)}...`
        : createMessageDto.content;

    if (channel.type === ChannelType.DIRECT_MESSAGE) {
      // For DMs, only notify the other participant — not the whole cohort
      const participants = this.extractDmParticipants(channel.name);
      if (participants) {
        const otherParticipantId = participants.find((id) => id !== userId);
        if (otherParticipantId) {
          await this.notificationsService.notifyDirectMessage(
            otherParticipantId,
            senderName,
            preview,
            message.channel.id,
          );
        }
      }
    } else {
      const recipients = await this.getChatNotificationRecipients(
        message.channel.cohortId,
        userId,
      );

      if (recipients.length > 0) {
        await this.notificationsService.notifyBulkChatMessage(
          recipients,
          senderName,
          message.channel.name,
          preview,
          message.channel.id,
        );
      }
    }

    return message;
  }

  private async handleMentionsAfterMessageCreated(
    message: { id: string; channelId: string; userId: string },
    content: string,
  ) {
    const candidates = this.extractMentionCandidates(content);
    if (candidates.length === 0) return;

    // Resolve mention tokens to actual users allowed in this channel
    const mentionable = await this.getMentionableUsersForChannel(
      message.channelId,
      message.userId,
    );
    const mentionableByKey = new Map(
      mentionable.map((u) => [this.normalizeMentionKey(u), u]),
    );

    const mentionedUsers = new Map<string, { id: string; firstName: string; lastName: string }>();
    for (const raw of candidates) {
      const key = this.normalizeMentionToken(raw);
      const match = mentionableByKey.get(key);
      if (match) mentionedUsers.set(match.id, match);
    }
    if (mentionedUsers.size === 0) return;

    const rows = Array.from(mentionedUsers.keys()).map((mentionedUserId) => ({
      messageId: message.id,
      mentionedUserId,
      mentionedByUserId: message.userId,
    }));

    await (this.prisma as any).chatMessageMention.createMany({
      data: rows,
      skipDuplicates: true,
    });

    // Create one notification per mentioned user (exclude self)
    const recipients = Array.from(mentionedUsers.keys()).filter(
      (id) => id !== message.userId,
    );
    if (recipients.length === 0) return;

    const channel = await this.prisma.channel.findUnique({
      where: { id: message.channelId },
      select: { id: true, name: true, cohortId: true, type: true },
    });
    const sender = await this.prisma.user.findUnique({
      where: { id: message.userId },
      select: { firstName: true, lastName: true },
    });
    const senderName =
      `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim() || 'Someone';
    const preview =
      content.length > 120 ? `${content.slice(0, 117)}...` : content;
    const channelName = channel?.name || 'chat';

    await this.notificationsService.createBulkNotifications(
      recipients.map((userId) => ({
        userId,
        type: 'CHAT_MENTION' as any,
        title: `You were mentioned in ${channelName}`,
        message: `${senderName}: ${preview}`,
        data: { channelId: message.channelId, messageId: message.id },
      })),
    );
  }

  private extractMentionCandidates(content: string): string[] {
    // Keep it intentionally conservative: @token must start with a letter.
    // We will normalize and match against cohort/channel member names.
    const out: string[] = [];
    const re = /@([A-Za-z][A-Za-z0-9_.-]{1,32})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      out.push(m[1]);
    }
    return Array.from(new Set(out));
  }

  private normalizeMentionToken(token: string): string {
    return token.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  }

  private normalizeMentionKey(user: { firstName?: string | null; lastName?: string | null }): string {
    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    return `${first}${last}`.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
  }

  private async getMentionableUsersForChannel(channelId: string, requesterId: string) {
    const channel = await this.getChannelById(channelId);
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { id: true, role: true, cohortId: true },
    });
    if (!requester) throw new ForbiddenException('User not found');

    if (channel.type === ChannelType.DIRECT_MESSAGE) {
      const participants = this.extractDmParticipants(channel.name);
      if (!participants || !participants.includes(requesterId)) {
        // Admin DM observer should not be able to mention participants (they can't send anyway)
        throw new ForbiddenException('You do not have access to this conversation');
      }
      return this.prisma.user.findMany({
        where: { id: { in: participants } },
        select: { id: true, firstName: true, lastName: true, role: true },
      });
    }

    if (requester.role !== 'ADMIN' && requester.cohortId !== channel.cohortId) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    // Mentionable users: cohort fellows + facilitators + guest facilitators + admins
    return this.prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { cohortId: channel.cohortId, role: 'FELLOW' },
          { cohortId: channel.cohortId, role: 'FACILITATOR' },
          { cohortId: channel.cohortId, role: 'GUEST_FACILITATOR' },
        ],
      },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
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

    if (channel.type === ChannelType.DIRECT_MESSAGE) {
      // DM: participants can read; admin can read (view-only); others denied
      const participants = this.extractDmParticipants(channel.name);
      if (!participants) throw new ForbiddenException('Invalid DM channel');
      if (user?.role !== 'ADMIN' && !participants.includes(userId)) {
        throw new ForbiddenException(
          'You do not have access to this private conversation',
        );
      }
    } else if (user?.role !== 'ADMIN' && user?.cohortId !== channel.cohortId) {
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

    const messages = await this.prisma.chatMessage.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    if (messages.length === 0) return messages as any;

    const messageIds = messages.map((m) => m.id);
    const parentIds = Array.from(
      new Set(messages.map((m: any) => m.parentMessageId).filter(Boolean)),
    ) as string[];

    const [reactions, mentions, parents] = await Promise.all([
      (this.prisma as any).chatMessageReaction.findMany({
        where: { messageId: { in: messageIds } },
        select: { messageId: true, userId: true, emoji: true },
      }),
      (this.prisma as any).chatMessageMention.findMany({
        where: { messageId: { in: messageIds } },
        select: { messageId: true, mentionedUserId: true },
      }),
      parentIds.length
        ? this.prisma.chatMessage.findMany({
            where: { id: { in: parentIds }, isDeleted: false },
            select: {
              id: true,
              channelId: true,
              content: true,
              createdAt: true,
              user: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const reactionsByMessage = new Map<
      string,
      Map<string, { emoji: string; userIds: Set<string> }>
    >();
    for (const r of reactions || []) {
      const byEmoji = reactionsByMessage.get(r.messageId) ?? new Map();
      const entry = byEmoji.get(r.emoji) ?? { emoji: r.emoji, userIds: new Set<string>() };
      entry.userIds.add(r.userId);
      byEmoji.set(r.emoji, entry);
      reactionsByMessage.set(r.messageId, byEmoji);
    }

    const mentionsByMessage = new Map<string, string[]>();
    for (const m of mentions || []) {
      const arr = mentionsByMessage.get(m.messageId) ?? [];
      arr.push(m.mentionedUserId);
      mentionsByMessage.set(m.messageId, arr);
    }

    const parentById = new Map(parents.map((p) => [p.id, p]));

    return messages.map((m: any) => {
      const byEmoji = reactionsByMessage.get(m.id) ?? new Map();
      const reactionSummary = Array.from(byEmoji.values()).map((e) => ({
        emoji: e.emoji,
        count: e.userIds.size,
        reactedByMe: e.userIds.has(userId),
      }));

      return {
        ...m,
        reactions: reactionSummary,
        mentionUserIds: mentionsByMessage.get(m.id) ?? [],
        parentMessage: m.parentMessageId ? parentById.get(m.parentMessageId) ?? null : null,
      };
    });
  }

  async getChannelMembers(channelId: string, requesterId: string) {
    const members = await this.getMentionableUsersForChannel(channelId, requesterId);
    return members.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      role: m.role,
    }));
  }

  async toggleMessageReaction(messageId: string, userId: string, emoji: string) {
    if (!emoji || typeof emoji !== 'string') {
      throw new ForbiddenException('Emoji is required');
    }
    emoji = emoji.trim();
    if (!emoji) throw new ForbiddenException('Emoji is required');

    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true, isDeleted: true },
    });
    if (!message || message.isDeleted) throw new NotFoundException('Message not found');

    // Access control: must be able to read the channel
    await this.getChannelMessages(message.channelId, userId, 1);

    const existing = await (this.prisma as any).chatMessageReaction.findFirst({
      where: { messageId, userId, emoji },
      select: { id: true },
    });

    if (existing) {
      await (this.prisma as any).chatMessageReaction.delete({ where: { id: existing.id } });
    } else {
      await (this.prisma as any).chatMessageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    const reactions = await (this.prisma as any).chatMessageReaction.findMany({
      where: { messageId },
      select: { emoji: true, userId: true },
    });

    const byEmoji = new Map<string, Set<string>>();
    for (const r of reactions) {
      const set = byEmoji.get(r.emoji) ?? new Set<string>();
      set.add(r.userId);
      byEmoji.set(r.emoji, set);
    }

    return {
      channelId: message.channelId,
      messageId,
      reactions: Array.from(byEmoji.entries()).map(([e, users]) => ({
        emoji: e,
        count: users.size,
        reactedByMe: users.has(userId),
      })),
    };
  }

  async removeMessageReaction(messageId: string, userId: string, emoji: string) {
    if (!emoji || typeof emoji !== 'string') {
      throw new ForbiddenException('Emoji is required');
    }
    emoji = emoji.trim();
    if (!emoji) throw new ForbiddenException('Emoji is required');

    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true, isDeleted: true },
    });
    if (!message || message.isDeleted) throw new NotFoundException('Message not found');

    // Access control: must be able to read the channel
    await this.getChannelMessages(message.channelId, userId, 1);

    await (this.prisma as any).chatMessageReaction.deleteMany({
      where: { messageId, userId, emoji },
    });

    const reactions = await (this.prisma as any).chatMessageReaction.findMany({
      where: { messageId },
      select: { emoji: true, userId: true },
    });

    const byEmoji = new Map<string, Set<string>>();
    for (const r of reactions) {
      const set = byEmoji.get(r.emoji) ?? new Set<string>();
      set.add(r.userId);
      byEmoji.set(r.emoji, set);
    }

    return {
      channelId: message.channelId,
      messageId,
      reactions: Array.from(byEmoji.entries()).map(([e, users]) => ({
        emoji: e,
        count: users.size,
        reactedByMe: users.has(userId),
      })),
    };
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

    const recipients = await this.getChatNotificationRecipients(
      updated.cohortId,
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

    if (
      !user ||
      (user.role !== 'ADMIN' &&
        user.role !== 'FACILITATOR' &&
        user.role !== 'GUEST_FACILITATOR')
    ) {
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

  async findOrCreateDirectChannel(requesterId: string, targetUserId: string) {
    if (requesterId === targetUserId) {
      throw new ForbiddenException('Cannot create a DM with yourself');
    }

    const [requester, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { cohortId: true, firstName: true, lastName: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { cohortId: true, firstName: true, lastName: true },
      }),
    ]);

    if (!requester || !target) {
      throw new NotFoundException('User not found');
    }

    const cohortId = requester.cohortId || target.cohortId;
    if (!cohortId) {
      throw new ForbiddenException('Both users must belong to a cohort to message');
    }

    // Canonical name ensures only one channel per pair
    const sortedIds = [requesterId, targetUserId].sort();
    const dmName = `dm::${sortedIds[0]}::${sortedIds[1]}`;

    const existing = await this.prisma.channel.findFirst({
      where: { name: dmName, type: ChannelType.DIRECT_MESSAGE },
    });
    if (existing) return existing;

    const channel = await this.prisma.channel.create({
      data: {
        cohortId,
        type: ChannelType.DIRECT_MESSAGE,
        name: dmName,
        description: `${requester.firstName} & ${target.firstName}`,
      },
    });

    // Create ChannelMember records for both participants
    await this.prisma.channelMember.createMany({
      data: [
        { channelId: channel.id, userId: requesterId },
        { channelId: channel.id, userId: targetUserId },
      ],
      skipDuplicates: true,
    });

    return channel;
  }

  async markChannelRead(channelId: string, userId: string) {
    await this.prisma.channelMember.upsert({
      where: { channelId_userId: { channelId, userId } },
      create: { channelId, userId, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  private async getChatNotificationRecipients(
    cohortId: string,
    excludeUserId: string,
  ): Promise<string[]> {
    const [members, facilitators] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          id: { not: excludeUserId },
          OR: [
            { role: 'FELLOW', cohortId },
            { role: 'FACILITATOR', cohortId },
            { role: 'GUEST_FACILITATOR', cohortId },
          ],
        },
        select: { id: true },
      }),
      (this.prisma as any).cohortFacilitator.findMany({
        where: { cohortId },
        select: { userId: true },
      }),
    ]);

    const recipientIds = new Set<string>([
      ...members.map((r: any) => r.id),
      ...facilitators.map((f: any) => f.userId).filter((id: string) => id !== excludeUserId),
    ]);

    return Array.from(recipientIds);
  }
}
