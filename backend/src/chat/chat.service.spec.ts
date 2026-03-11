import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChannelType } from '@prisma/client';

describe('ChatService', () => {
  let service: ChatService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    channel: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    cohort: {
      findUnique: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    engagementEvent: {
      create: jest.fn(),
    },
    pointsLog: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    channelMember: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      createMany: jest.fn(),
    },
    cohortFacilitator: {
      findMany: jest.fn(),
    },
  };

  const mockNotificationsService = {
    notifyChatRoomCreated: jest.fn().mockResolvedValue(undefined),
    notifyBulkChatMessage: jest.fn().mockResolvedValue(undefined),
    notifyDirectMessage: jest.fn().mockResolvedValue(undefined),
    notifyChatRoomLockUpdated: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createChannel', () => {
    it('should throw ForbiddenException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createChannel({ cohortId: 'cohort-1', name: 'General', type: ChannelType.COHORT_WIDE }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when facilitator creates channel for different cohort', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FACILITATOR',
        cohortId: 'cohort-2',
      });

      await expect(
        service.createChannel(
          { cohortId: 'cohort-1', name: 'General', type: ChannelType.COHORT_WIDE },
          'facilitator-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create channel and notify cohort members', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        cohortId: null,
      });

      const mockChannel = { id: 'channel-1', name: 'General', cohortId: 'cohort-1' };
      mockPrismaService.channel.create.mockResolvedValue(mockChannel);
      mockPrismaService.cohort.findUnique.mockResolvedValue({ id: 'cohort-1', name: 'Cohort Alpha' });
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'user-2' }]);
      (mockPrismaService as any).cohortFacilitator = {
        findMany: jest.fn().mockResolvedValue([]),
      };

      const result = await service.createChannel(
        { cohortId: 'cohort-1', name: 'General', type: ChannelType.COHORT_WIDE },
        'admin-1',
      );

      expect(result).toEqual(mockChannel);
      expect(mockPrismaService.channel.create).toHaveBeenCalled();
    });
  });

  describe('getCohortChannels', () => {
    it('should throw ForbiddenException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCohortChannels('cohort-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user tries to access different cohort', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FELLOW',
        cohortId: 'cohort-2',
      });

      await expect(service.getCohortChannels('cohort-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should return channels for own cohort', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FELLOW',
        cohortId: 'cohort-1',
      });

      const mockChannels = [
        { id: 'ch-1', name: 'General', type: ChannelType.COHORT_WIDE, cohort: { id: 'cohort-1', name: 'Alpha' } },
      ];
      mockPrismaService.channel.findMany.mockResolvedValue(mockChannels);

      const result = await service.getCohortChannels('cohort-1', 'user-1');

      expect(result).toEqual(mockChannels);
    });

    it('should allow admin to access any cohort channels', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        cohortId: null,
      });

      mockPrismaService.channel.findMany.mockResolvedValue([]);

      const result = await service.getCohortChannels('cohort-1', 'admin-1');

      expect(result).toEqual([]);
    });
  });

  describe('getChannelById', () => {
    it('should throw NotFoundException when channel not found', async () => {
      mockPrismaService.channel.findUnique.mockResolvedValue(null);

      await expect(service.getChannelById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return channel when found', async () => {
      const mockChannel = { id: 'ch-1', name: 'General', type: ChannelType.COHORT_WIDE };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);

      const result = await service.getChannelById('ch-1');

      expect(result).toEqual(mockChannel);
    });
  });

  describe('archiveChannel', () => {
    it('should throw ForbiddenException when user is not admin or facilitator', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW', cohortId: 'cohort-1' });

      await expect(service.archiveChannel('ch-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when channel not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN', cohortId: null });
      mockPrismaService.channel.findUnique.mockResolvedValue(null);

      await expect(service.archiveChannel('ch-1', 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should archive channel when admin calls', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN', cohortId: null });
      const mockChannel = { id: 'ch-1', cohortId: 'cohort-1', name: 'General' };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.channel.update.mockResolvedValue({ ...mockChannel, isArchived: true });

      const result = await service.archiveChannel('ch-1', 'admin-1');

      expect(mockPrismaService.channel.update).toHaveBeenCalledWith({
        where: { id: 'ch-1' },
        data: { isArchived: true },
      });
    });
  });

  describe('deleteChannel', () => {
    it('should throw ForbiddenException when non-admin/facilitator tries to delete', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW', cohortId: 'cohort-1' });

      await expect(service.deleteChannel('ch-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should delete channel messages then channel', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN', cohortId: null });
      const mockChannel = { id: 'ch-1', cohortId: 'cohort-1', name: 'General' };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.chatMessage.deleteMany.mockResolvedValue({ count: 5 });
      mockPrismaService.channel.delete.mockResolvedValue(mockChannel);

      const result = await service.deleteChannel('ch-1', 'admin-1');

      expect(mockPrismaService.chatMessage.deleteMany).toHaveBeenCalledWith({
        where: { channelId: 'ch-1' },
      });
      expect(mockPrismaService.channel.delete).toHaveBeenCalledWith({ where: { id: 'ch-1' } });
      expect(result).toEqual(mockChannel);
    });
  });

  describe('createMessage', () => {
    it('should throw ForbiddenException when user not in cohort for non-DM channel', async () => {
      const mockChannel = {
        id: 'ch-1',
        type: ChannelType.COHORT_WIDE,
        cohortId: 'cohort-1',
        isLocked: false,
        name: 'General',
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-2', role: 'FELLOW' });

      await expect(
        service.createMessage({ channelId: 'ch-1', content: 'Hello!' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create message in public channel', async () => {
      const mockChannel = {
        id: 'ch-1',
        type: ChannelType.COHORT_WIDE,
        cohortId: 'cohort-1',
        isLocked: false,
        name: 'General',
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1', role: 'FELLOW' });

      const mockMessage = {
        id: 'msg-1',
        userId: 'user-1',
        channelId: 'ch-1',
        content: 'Hello!',
        user: { id: 'user-1', firstName: 'John', lastName: 'Doe', role: 'FELLOW' },
        channel: { id: 'ch-1', name: 'General', cohortId: 'cohort-1' },
      };
      mockPrismaService.chatMessage.create.mockResolvedValue(mockMessage);
      mockPrismaService.engagementEvent.create.mockResolvedValue({});
      mockPrismaService.pointsLog.aggregate.mockResolvedValue({ _sum: { points: 0 } });
      mockPrismaService.pointsLog.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.user.findMany.mockResolvedValue([]);
      (mockPrismaService as any).cohortFacilitator = { findMany: jest.fn().mockResolvedValue([]) };

      const result = await service.createMessage({ channelId: 'ch-1', content: 'Hello!' }, 'user-1');

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.chatMessage.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when channel is locked and user is not admin/facilitator', async () => {
      const mockChannel = {
        id: 'ch-1',
        type: ChannelType.COHORT_WIDE,
        cohortId: 'cohort-1',
        isLocked: true,
        name: 'Announcements',
      };
      mockPrismaService.channel.findUnique.mockResolvedValue(mockChannel);
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1', role: 'FELLOW' });

      await expect(
        service.createMessage({ channelId: 'ch-1', content: 'Hi' }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    it('should throw NotFoundException when message not found', async () => {
      mockPrismaService.chatMessage.findUnique.mockResolvedValue(null);

      await expect(service.deleteMessage('msg-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-author non-admin tries to delete', async () => {
      mockPrismaService.chatMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        userId: 'other-user',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW', cohortId: 'cohort-1' });

      await expect(service.deleteMessage('msg-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should soft-delete message owned by user', async () => {
      mockPrismaService.chatMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        userId: 'user-1',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW', cohortId: 'cohort-1' });
      mockPrismaService.chatMessage.update.mockResolvedValue({ id: 'msg-1', isDeleted: true });

      const result = await service.deleteMessage('msg-1', 'user-1');

      expect(mockPrismaService.chatMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: { isDeleted: true },
      });
    });
  });

  describe('flagMessage', () => {
    it('should throw NotFoundException when message not found', async () => {
      mockPrismaService.chatMessage.findUnique.mockResolvedValue(null);

      await expect(service.flagMessage('msg-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-admin/facilitator flags', async () => {
      mockPrismaService.chatMessage.findUnique.mockResolvedValue({ id: 'msg-1' });
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW' });

      await expect(service.flagMessage('msg-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should flag message when admin calls', async () => {
      mockPrismaService.chatMessage.findUnique.mockResolvedValue({ id: 'msg-1' });
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
      mockPrismaService.chatMessage.update.mockResolvedValue({ id: 'msg-1', isFlagged: true });

      await service.flagMessage('msg-1', 'admin-1');

      expect(mockPrismaService.chatMessage.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: { isFlagged: true },
      });
    });
  });

  describe('findOrCreateDirectChannel', () => {
    it('should throw ForbiddenException when user tries to DM themselves', async () => {
      await expect(
        service.findOrCreateDirectChannel('user-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when either user not found', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ cohortId: 'cohort-1', firstName: 'John', lastName: 'Doe' })
        .mockResolvedValueOnce(null);

      await expect(
        service.findOrCreateDirectChannel('user-1', 'user-2'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return existing DM channel if one already exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ cohortId: 'cohort-1', firstName: 'John', lastName: 'Doe' })
        .mockResolvedValueOnce({ cohortId: 'cohort-1', firstName: 'Jane', lastName: 'Smith' });

      const existingChannel = { id: 'dm-1', name: 'dm::user-1::user-2', type: ChannelType.DIRECT_MESSAGE };
      mockPrismaService.channel.findFirst.mockResolvedValue(existingChannel);

      const result = await service.findOrCreateDirectChannel('user-1', 'user-2');

      expect(result).toEqual(existingChannel);
      expect(mockPrismaService.channel.create).not.toHaveBeenCalled();
    });

    it('should create new DM channel when none exists', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ cohortId: 'cohort-1', firstName: 'John', lastName: 'Doe' })
        .mockResolvedValueOnce({ cohortId: 'cohort-1', firstName: 'Jane', lastName: 'Smith' });

      mockPrismaService.channel.findFirst.mockResolvedValue(null);
      const newChannel = { id: 'dm-new', name: 'dm::user-1::user-2', type: ChannelType.DIRECT_MESSAGE };
      mockPrismaService.channel.create.mockResolvedValue(newChannel);
      mockPrismaService.channelMember.createMany.mockResolvedValue({ count: 2 });

      const result = await service.findOrCreateDirectChannel('user-1', 'user-2');

      expect(result).toEqual(newChannel);
      expect(mockPrismaService.channel.create).toHaveBeenCalled();
      expect(mockPrismaService.channelMember.createMany).toHaveBeenCalled();
    });
  });

  describe('markChannelRead', () => {
    it('should upsert channelMember read timestamp', async () => {
      mockPrismaService.channelMember.upsert.mockResolvedValue({});

      const result = await service.markChannelRead('ch-1', 'user-1');

      expect(result).toEqual({ ok: true });
      expect(mockPrismaService.channelMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { channelId_userId: { channelId: 'ch-1', userId: 'user-1' } },
        }),
      );
    });
  });

  describe('initializeCohortChannels', () => {
    it('should create default channels for a cohort', async () => {
      mockPrismaService.channel.create
        .mockResolvedValueOnce({ id: 'ch-1', name: 'General' })
        .mockResolvedValueOnce({ id: 'ch-2', name: 'Help & Questions' });

      const result = await service.initializeCohortChannels('cohort-1');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.channel.create).toHaveBeenCalledTimes(2);
    });
  });
});
