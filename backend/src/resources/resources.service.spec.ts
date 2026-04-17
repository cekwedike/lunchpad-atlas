import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma.service';
import { AchievementsService } from '../achievements/achievements.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PointsService } from '../gamification/points.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    resource: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    resourceProgress: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    pointsLog: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockAchievementsService = {
    checkAndAwardAchievements: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
    notifyAntiSkimmingWarning: jest.fn(),
  };

  const mockPointsService = {
    awardPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AchievementsService, useValue: mockAchievementsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PointsService, useValue: mockPointsService },
      ],
    }).compile();

    service = module.get<ResourcesService>(ResourcesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getResources', () => {
    it('should return paginated resources with progress', async () => {
      const userId = '123';
      const filters = { page: 1, limit: 10 };

      const mockResources = [
        {
          id: 'res-1',
          title: 'Test Resource',
          type: 'VIDEO',
          duration: 20,
          pointValue: 100,
          sessionId: 'session-1',
          progress: [{ state: 'COMPLETED' }],
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW' });
      mockPrismaService.resourceProgress.findUnique.mockResolvedValue({ state: 'COMPLETED' });
      mockPrismaService.resource.findMany.mockResolvedValue(mockResources);
      mockPrismaService.resource.count.mockResolvedValue(1);

      const result = await service.getResources(userId, filters);

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'res-1',
            state: 'COMPLETED',
          }),
        ]),
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should handle resources with no progress', async () => {
      const userId = '123';
      const filters = { page: 1, limit: 10 };

      const mockResources = [
        {
          id: 'res-1',
          title: 'Test Resource',
          type: 'VIDEO',
          duration: 20,
          pointValue: 100,
          sessionId: 'session-1',
          progress: [],
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW' });
      mockPrismaService.resourceProgress.findUnique.mockResolvedValue({ state: 'LOCKED' });
      mockPrismaService.resource.findMany.mockResolvedValue(mockResources);
      mockPrismaService.resource.count.mockResolvedValue(1);

      const result = await service.getResources(userId, filters);

      expect(result.data[0].state).toBe('LOCKED');
    });
  });

  describe('completeResource', () => {
    const baseResource = {
      id: 'res-1',
      title: 'Test Resource',
      pointValue: 100,
      estimatedMinutes: 10,
      type: 'VIDEO',
      session: { unlockDate: new Date() },
    };

    const baseProgress = {
      state: 'IN_PROGRESS',
      scrollDepth: 0,
      watchPercentage: 90,
      minimumThresholdMet: true,
      engagementQuality: 0.5,
    };

    const completedProgress = {
      id: 'progress-1',
      state: 'COMPLETED',
      completedAt: new Date(),
    };

    const awardedPointsResult = {
      awarded: true,
      capped: false,
      monthResetApplied: false,
    };

    it('should mark resource as complete and award points', async () => {
      const userId = '123';
      const resourceId = 'res-1';

      const mockResource = { ...baseResource, id: resourceId };
      const existingProgress = { ...baseProgress };

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);
      mockPrismaService.resourceProgress.findMany.mockResolvedValue([]);
      mockPrismaService.resourceProgress.findUnique.mockResolvedValue(existingProgress);
      mockPrismaService.resourceProgress.update.mockResolvedValue(completedProgress);
      mockPointsService.awardPoints.mockResolvedValue(awardedPointsResult);
      mockAchievementsService.checkAndAwardAchievements.mockResolvedValue([]);

      const qualityBonus = Math.floor(
        mockResource.pointValue * existingProgress.engagementQuality * 0.2,
      );
      const totalPoints = mockResource.pointValue + qualityBonus + 10;

      const result = await service.markComplete(resourceId, userId);

      expect(result).toHaveProperty('completedAt');
      expect(result.state).toBe('COMPLETED');
      expect(mockPointsService.awardPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          points: totalPoints,
          eventType: 'RESOURCE_COMPLETE',
        }),
      );
    });

    it('should not award points if already completed', async () => {
      const userId = '123';
      const resourceId = 'res-1';

      const mockResource = { ...baseResource, id: resourceId };

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);
      mockPrismaService.resourceProgress.findUnique.mockResolvedValue({
        state: 'COMPLETED',
        scrollDepth: 0,
        watchPercentage: 90,
        minimumThresholdMet: true,
        engagementQuality: 0.2,
      });
      mockPrismaService.resourceProgress.update.mockResolvedValue({
        id: 'progress-1',
        state: 'COMPLETED',
      });
      mockAchievementsService.checkAndAwardAchievements.mockResolvedValue([]);

      await service.markComplete(resourceId, userId);

      expect(mockPointsService.awardPoints).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if resource does not exist', async () => {
      mockPrismaService.resource.findUnique.mockResolvedValue(null);

      await expect(service.markComplete('nonexistent', '123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject ARTICLE via markComplete (use completeArticleOpen instead)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW' });
      mockPrismaService.resource.findUnique.mockResolvedValue({
        id: 'res-article',
        title: 'Article',
        type: 'ARTICLE',
        pointValue: 60,
        estimatedMinutes: 10,
        session: { unlockDate: new Date() },
      });

      await expect(service.markComplete('res-article', '123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not apply anti-skimming penalty for high-quality completions', async () => {
      const userId = '123';
      const resourceId = 'res-1';
      const mockResource = { ...baseResource, id: resourceId };
      const existingProgress = {
        ...baseProgress,
        engagementQuality: 0.82,
        watchPercentage: 96,
      };

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);
      mockPrismaService.resourceProgress.findUnique.mockResolvedValue(existingProgress);
      mockPrismaService.resourceProgress.update.mockResolvedValue(completedProgress);
      mockPrismaService.resourceProgress.findMany.mockResolvedValue([
        {
          timeSpent: 120,
          watchPercentage: 95,
          engagementQuality: 0.8,
          resource: { minimumTimeThreshold: 420, type: 'VIDEO' },
        },
        {
          timeSpent: 100,
          watchPercentage: 93,
          engagementQuality: 0.75,
          resource: { minimumTimeThreshold: 420, type: 'VIDEO' },
        },
        {
          timeSpent: 160,
          watchPercentage: 98,
          engagementQuality: 0.9,
          resource: { minimumTimeThreshold: 420, type: 'VIDEO' },
        },
      ]);
      mockPointsService.awardPoints.mockResolvedValue(awardedPointsResult);
      mockAchievementsService.checkAndAwardAchievements.mockResolvedValue([]);

      await service.markComplete(resourceId, userId);

      expect(mockPointsService.awardPoints).toHaveBeenCalledWith(
        expect.objectContaining({ points: 126 }),
      );
      expect(mockNotificationsService.notifyAntiSkimmingWarning).not.toHaveBeenCalled();
    });

    it('should suppress anti-skimming warning inside cooldown window', async () => {
      const userId = '123';
      const resourceId = 'res-1';
      const mockResource = { ...baseResource, id: resourceId };
      const existingProgress = {
        ...baseProgress,
        engagementQuality: 0.2,
        watchPercentage: 86,
      };

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);
      mockPrismaService.resourceProgress.findUnique.mockResolvedValue(existingProgress);
      mockPrismaService.resourceProgress.update.mockResolvedValue(completedProgress);
      mockPrismaService.resourceProgress.findMany.mockResolvedValue([
        {
          timeSpent: 120,
          watchPercentage: 60,
          engagementQuality: 0.2,
          resource: { minimumTimeThreshold: 420, type: 'VIDEO' },
        },
        {
          timeSpent: 100,
          watchPercentage: 55,
          engagementQuality: 0.25,
          resource: { minimumTimeThreshold: 420, type: 'VIDEO' },
        },
        {
          timeSpent: 80,
          watchPercentage: 58,
          engagementQuality: 0.3,
          resource: { minimumTimeThreshold: 420, type: 'VIDEO' },
        },
      ]);
      mockPrismaService.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        createdAt: new Date(),
      });
      mockPointsService.awardPoints.mockResolvedValue(awardedPointsResult);
      mockAchievementsService.checkAndAwardAchievements.mockResolvedValue([]);

      await service.markComplete(resourceId, userId);

      expect(mockPointsService.awardPoints).toHaveBeenCalledWith(
        expect.objectContaining({ points: 57 }),
      );
      expect(mockNotificationsService.notifyAntiSkimmingWarning).not.toHaveBeenCalled();
    });
  });

  describe('completeArticleOpen', () => {
    const userId = 'user-1';
    const resourceId = 'res-article';

    const articleResource = {
      id: resourceId,
      title: 'Test Article',
      type: 'ARTICLE',
      isCore: true,
      minimumTimeThreshold: 420,
      estimatedMinutes: 10,
    };

    it('returns alreadyCompleted when progress is already COMPLETED', async () => {
      jest.spyOn(service, 'getResourceById').mockResolvedValue({ state: 'COMPLETED' } as any);
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW' });
      mockPrismaService.resource.findUnique.mockResolvedValue(articleResource);

      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb(mockPrismaService),
      );
      mockPrismaService.resourceProgress.findUnique.mockResolvedValue({
        state: 'COMPLETED',
        userId,
        resourceId,
      });

      const result = await service.completeArticleOpen(resourceId, userId);

      expect(result).toMatchObject({ alreadyCompleted: true, pointsAwarded: 0 });
      expect(mockPointsService.awardPoints).not.toHaveBeenCalled();
    });

    it('awards 30 points for core article on first completion', async () => {
      jest.spyOn(service, 'getResourceById').mockResolvedValue({ state: 'UNLOCKED' } as any);
      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'FELLOW' });
      mockPrismaService.resource.findUnique.mockResolvedValue(articleResource);

      mockPrismaService.$transaction.mockImplementation(async (cb: any) =>
        cb(mockPrismaService),
      );
      mockPrismaService.resourceProgress.findUnique
        .mockResolvedValueOnce({ state: 'IN_PROGRESS', userId, resourceId })
        .mockResolvedValueOnce({
          state: 'COMPLETED',
          userId,
          resourceId,
          id: 'p1',
        });
      mockPrismaService.resourceProgress.updateMany.mockResolvedValue({ count: 1 });

      mockPointsService.awardPoints.mockResolvedValue({
        awarded: true,
        capped: false,
        monthResetApplied: false,
      });
      mockAchievementsService.checkAndAwardAchievements.mockResolvedValue([]);

      const result = await service.completeArticleOpen(resourceId, userId);

      expect(result.pointsAwarded).toBe(30);
      expect(mockPointsService.awardPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          points: 30,
          eventType: 'RESOURCE_COMPLETE',
        }),
      );
    });
  });
});
