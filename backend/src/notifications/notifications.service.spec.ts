import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from './notifications.gateway';
import { PushService } from '../push/push.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrismaService = {
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    cohort: {
      findUnique: jest.fn(),
    },
    resource: {
      findUnique: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
  };

  const mockEmailService = {
    sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('false'),
  };

  const mockNotificationsGateway = {
    sendNotificationToUser: jest.fn(),
    sendUnreadCountUpdate: jest.fn(),
  };

  const mockPushService = {
    sendPushToUser: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: PushService, useValue: mockPushService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create and return a new notification when no recent duplicate exists', async () => {
      const dto = {
        userId: 'user-1',
        type: 'SYSTEM_ALERT' as any,
        title: 'Test Title',
        message: 'Test message',
      };

      const mockNotification = {
        id: 'notif-1',
        ...dto,
        isRead: false,
        createdAt: new Date(),
      };

      mockPrismaService.notification.findFirst.mockResolvedValue(null);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockPrismaService.notification.count.mockResolvedValue(0);

      const result = await service.createNotification(dto);

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: dto.userId,
          type: dto.type,
          title: dto.title,
          message: dto.message,
        }),
      });
    });

    it('should return existing notification if recent duplicate found', async () => {
      const dto = {
        userId: 'user-1',
        type: 'SYSTEM_ALERT' as any,
        title: 'Test Title',
        message: 'Test message',
      };

      const duplicateNotification = {
        id: 'notif-existing',
        ...dto,
        createdAt: new Date(Date.now() - 1000),
      };

      mockPrismaService.notification.findFirst.mockResolvedValue(duplicateNotification);

      const result = await service.createNotification(dto);

      expect(result).toEqual(duplicateNotification);
      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('createBulkNotifications', () => {
    it('should create multiple notifications', async () => {
      const notifications = [
        {
          userId: 'user-1',
          type: 'SYSTEM_ALERT' as any,
          title: 'Title 1',
          message: 'Message 1',
        },
        {
          userId: 'user-2',
          type: 'SYSTEM_ALERT' as any,
          title: 'Title 2',
          message: 'Message 2',
        },
      ];

      const mockResult = { count: 2 };
      mockPrismaService.notification.createMany.mockResolvedValue(mockResult);
      mockPrismaService.notification.count.mockResolvedValue(0);

      const result = await service.createBulkNotifications(notifications);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'user-1' }),
          expect.objectContaining({ userId: 'user-2' }),
        ]),
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should return notifications for a user', async () => {
      const userId = 'user-1';
      const mockNotifications = [
        {
          id: 'notif-1',
          userId,
          title: 'Test',
          message: 'Test message',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getUserNotifications(userId);

      expect(result).toEqual(mockNotifications);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId, isDeleted: false }),
        }),
      );
    });

    it('should filter to unread only when requested', async () => {
      const userId = 'user-1';
      mockPrismaService.notification.findMany.mockResolvedValue([]);

      await service.getUserNotifications(userId, 20, true);

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false, isDeleted: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read for the owning user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.markAsRead('notif-1', 'user-1');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead('user-1');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });

  describe('deleteNotification', () => {
    it('should soft-delete a notification', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 1 });

      await service.deleteNotification('notif-1', 'user-1');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isDeleted: true },
      });
    });
  });

  describe('deleteAll', () => {
    it('should soft-delete all notifications for user', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      await service.deleteAll('user-1');

      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isDeleted: true },
      });
    });
  });

  describe('notification helper methods', () => {
    beforeEach(() => {
      mockPrismaService.notification.findFirst.mockResolvedValue(null);
      mockPrismaService.notification.create.mockResolvedValue({
        id: 'notif-1',
        isRead: false,
        createdAt: new Date(),
      });
      mockPrismaService.notification.count.mockResolvedValue(0);
    });

    it('notifyResourceUnlock should create RESOURCE_UNLOCK notification', async () => {
      await service.notifyResourceUnlock('user-1', 'Intro to JS', 'res-1');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'RESOURCE_UNLOCK',
            userId: 'user-1',
          }),
        }),
      );
    });

    it('notifyAchievementEarned should create ACHIEVEMENT_EARNED notification', async () => {
      await service.notifyAchievementEarned('user-1', 'First Step', 'ach-1');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'ACHIEVEMENT_EARNED',
            userId: 'user-1',
          }),
        }),
      );
    });

    it('notifyDiscussionReply should create DISCUSSION_REPLY notification', async () => {
      await service.notifyDiscussionReply('user-1', 'Jane Doe', 'Test Discussion', 'disc-1');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'DISCUSSION_REPLY',
            userId: 'user-1',
          }),
        }),
      );
    });

    it('notifyAttendanceMarked should create ATTENDANCE_MARKED notification', async () => {
      await service.notifyAttendanceMarked('user-1', 'Session 1', 'sess-1', true, false);

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'ATTENDANCE_MARKED',
          }),
        }),
      );
    });

    it('notifyUserSuspended should create USER_SUSPENDED notification', async () => {
      await service.notifyUserSuspended('user-1', 'Violation of policy');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'USER_SUSPENDED',
            userId: 'user-1',
          }),
        }),
      );
    });

    it('notifyPointsAdjusted should create POINTS_ADJUSTED notification', async () => {
      await service.notifyPointsAdjusted('user-1', 'Admin Name', 50, 'Bonus points');

      expect(mockPrismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'POINTS_ADJUSTED',
            userId: 'user-1',
          }),
        }),
      );
    });
  });

  describe('notifyFellowsResourceUnlocked', () => {
    it('should notify all fellows in a cohort', async () => {
      const fellows = [{ id: 'user-1' }, { id: 'user-2' }];
      mockPrismaService.user.findMany.mockResolvedValue(fellows);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.notification.count.mockResolvedValue(0);

      await service.notifyFellowsResourceUnlocked('res-1', 'cohort-1', 'Intro to JS');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { cohortId: 'cohort-1', role: 'FELLOW' },
        select: { id: true },
      });
      expect(mockPrismaService.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 'user-1', type: 'RESOURCE_UNLOCK' }),
            expect.objectContaining({ userId: 'user-2', type: 'RESOURCE_UNLOCK' }),
          ]),
        }),
      );
    });
  });

  describe('sendCohortNotification', () => {
    it('should send notification to all fellows in cohort', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
      mockPrismaService.notification.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.notification.count.mockResolvedValue(0);

      await service.sendCohortNotification(
        'cohort-1',
        'SYSTEM_ALERT' as any,
        'Test',
        'Message',
      );

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { cohortId: 'cohort-1', role: 'FELLOW' },
        select: { id: true },
      });
    });
  });

  describe('getAllNotifications (admin)', () => {
    it('should return all notifications', async () => {
      const mockNotifications = [{ id: 'notif-1', userId: 'user-1' }];
      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);

      const result = await service.getAllNotifications();

      expect(result).toEqual(mockNotifications);
      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isDeleted: false }),
        }),
      );
    });
  });
});
