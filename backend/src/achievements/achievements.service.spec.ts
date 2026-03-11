import { Test, TestingModule } from '@nestjs/testing';
import { AchievementsService } from './achievements.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('AchievementsService', () => {
  let service: AchievementsService;

  const mockPrismaService = {
    achievement: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
    userAchievement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    resourceProgress: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    quizResponse: {
      count: jest.fn(),
    },
    discussion: {
      count: jest.fn(),
    },
    discussionComment: {
      count: jest.fn(),
    },
    liveQuizParticipant: {
      count: jest.fn(),
    },
    pointsLog: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    resource: {
      findMany: jest.fn(),
    },
    session: {
      findMany: jest.fn(),
    },
    cohort: {
      findUnique: jest.fn(),
    },
  };

  const mockNotificationsService = {
    notifyAchievementEarned: jest.fn(),
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AchievementsService>(AchievementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should seed achievement definitions on bootstrap', async () => {
      mockPrismaService.achievement.findMany.mockResolvedValue([]);
      mockPrismaService.achievement.createMany.mockResolvedValue({ count: 44 });

      await service.onApplicationBootstrap();

      expect(mockPrismaService.achievement.createMany).toHaveBeenCalled();
    });

    it('should update existing achievements without creating duplicates', async () => {
      // Simulate one existing achievement
      mockPrismaService.achievement.findMany.mockResolvedValue([
        { id: 'ach-1', name: 'First Step' },
      ]);
      mockPrismaService.achievement.createMany.mockResolvedValue({ count: 43 });
      mockPrismaService.achievement.update.mockResolvedValue({});

      await service.onApplicationBootstrap();

      expect(mockPrismaService.achievement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ach-1' },
          data: expect.objectContaining({
            description: 'Complete your first resource',
            type: 'MILESTONE',
          }),
        }),
      );
    });
  });

  describe('checkAndAwardAchievements', () => {
    const setupStatsForUser = (overrides: Record<string, any> = {}) => {
      const defaults = {
        resourceCount: 0,
        quizCount: 0,
        perfectQuizCount: 0,
        discussionCount: 0,
        commentCount: 0,
        liveQuizCount: 0,
        qualityDiscussionCount: 0,
        liveQuizTop3: 0,
        totalPoints: 0,
        coreResources: [] as any[],
        optionalSessions: [] as any[],
        completedCoreCount: 0,
        completedOptionalProgress: [] as any[],
      };
      const data = { ...defaults, ...overrides };

      mockPrismaService.userAchievement.findMany.mockResolvedValue([]);
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: null });
      mockPrismaService.resourceProgress.count.mockResolvedValue(data.resourceCount);
      mockPrismaService.quizResponse.count
        .mockResolvedValueOnce(data.quizCount)
        .mockResolvedValueOnce(data.perfectQuizCount);
      mockPrismaService.discussion.count.mockResolvedValueOnce(data.discussionCount).mockResolvedValueOnce(data.qualityDiscussionCount);
      mockPrismaService.discussionComment.count.mockResolvedValue(data.commentCount);
      mockPrismaService.liveQuizParticipant.count
        .mockResolvedValueOnce(data.liveQuizCount)
        .mockResolvedValueOnce(data.liveQuizTop3);
      mockPrismaService.pointsLog.aggregate.mockResolvedValue({
        _sum: { points: data.totalPoints },
      });
      mockPrismaService.resource.findMany.mockResolvedValue(data.coreResources);
      mockPrismaService.session.findMany.mockResolvedValue(data.optionalSessions);
      mockPrismaService.resourceProgress.findMany.mockResolvedValue(data.completedOptionalProgress);
    };

    it('should return empty array when all achievements already unlocked', async () => {
      mockPrismaService.userAchievement.findMany.mockResolvedValue([
        { achievementId: 'ach-1' },
      ]);
      mockPrismaService.achievement.findMany.mockResolvedValue([]);

      const result = await service.checkAndAwardAchievements('user-1');

      expect(result).toEqual([]);
    });

    it('should award "First Step" achievement when user completes 1 resource', async () => {
      const firstStepAchievement = {
        id: 'ach-first-step',
        name: 'First Step',
        type: 'MILESTONE',
        pointValue: 10,
        criteria: JSON.stringify({ resourceCount: 1 }),
      };

      mockPrismaService.userAchievement.findMany.mockResolvedValue([]);
      mockPrismaService.achievement.findMany.mockResolvedValue([firstStepAchievement]);
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: null });
      mockPrismaService.resourceProgress.count.mockResolvedValue(1);
      mockPrismaService.quizResponse.count.mockResolvedValue(0);
      mockPrismaService.discussion.count.mockResolvedValue(0);
      mockPrismaService.discussionComment.count.mockResolvedValue(0);
      mockPrismaService.liveQuizParticipant.count.mockResolvedValue(0);
      mockPrismaService.pointsLog.aggregate.mockResolvedValue({ _sum: { points: 0 } });
      mockPrismaService.resource.findMany.mockResolvedValue([]);
      mockPrismaService.session.findMany.mockResolvedValue([]);
      mockPrismaService.resourceProgress.findMany.mockResolvedValue([]);
      mockPrismaService.userAchievement.create.mockResolvedValue({});
      mockPrismaService.pointsLog.create.mockResolvedValue({});
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockNotificationsService.notifyAchievementEarned.mockResolvedValue(undefined);

      const result = await service.checkAndAwardAchievements('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('First Step');
      expect(mockPrismaService.userAchievement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          achievementId: 'ach-first-step',
        }),
      });
    });

    it('should not award achievement when criteria not met', async () => {
      const resourceMasterAchievement = {
        id: 'ach-resource-master',
        name: 'Resource Master',
        type: 'MILESTONE',
        pointValue: 250,
        criteria: JSON.stringify({ resourceCount: 50 }),
      };

      mockPrismaService.userAchievement.findMany.mockResolvedValue([]);
      mockPrismaService.achievement.findMany.mockResolvedValue([resourceMasterAchievement]);
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: null });
      mockPrismaService.resourceProgress.count.mockResolvedValue(10); // Only 10, need 50
      mockPrismaService.quizResponse.count.mockResolvedValue(0);
      mockPrismaService.discussion.count.mockResolvedValue(0);
      mockPrismaService.discussionComment.count.mockResolvedValue(0);
      mockPrismaService.liveQuizParticipant.count.mockResolvedValue(0);
      mockPrismaService.pointsLog.aggregate.mockResolvedValue({ _sum: { points: 0 } });
      mockPrismaService.resource.findMany.mockResolvedValue([]);
      mockPrismaService.session.findMany.mockResolvedValue([]);
      mockPrismaService.resourceProgress.findMany.mockResolvedValue([]);

      const result = await service.checkAndAwardAchievements('user-1');

      expect(result).toHaveLength(0);
      expect(mockPrismaService.userAchievement.create).not.toHaveBeenCalled();
    });

    it('should award points bonus for achievement', async () => {
      const achievement = {
        id: 'ach-1',
        name: 'First Step',
        type: 'MILESTONE',
        pointValue: 10,
        criteria: JSON.stringify({ resourceCount: 1 }),
      };

      mockPrismaService.userAchievement.findMany.mockResolvedValue([]);
      mockPrismaService.achievement.findMany.mockResolvedValue([achievement]);
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: null });
      mockPrismaService.resourceProgress.count.mockResolvedValue(1);
      mockPrismaService.quizResponse.count.mockResolvedValue(0);
      mockPrismaService.discussion.count.mockResolvedValue(0);
      mockPrismaService.discussionComment.count.mockResolvedValue(0);
      mockPrismaService.liveQuizParticipant.count.mockResolvedValue(0);
      mockPrismaService.pointsLog.aggregate.mockResolvedValue({ _sum: { points: 0 } });
      mockPrismaService.resource.findMany.mockResolvedValue([]);
      mockPrismaService.session.findMany.mockResolvedValue([]);
      mockPrismaService.resourceProgress.findMany.mockResolvedValue([]);
      mockPrismaService.userAchievement.create.mockResolvedValue({});
      mockPrismaService.pointsLog.create.mockResolvedValue({});
      mockPrismaService.user.findMany.mockResolvedValue([]);
      mockNotificationsService.notifyAchievementEarned.mockResolvedValue(undefined);

      await service.checkAndAwardAchievements('user-1');

      expect(mockPrismaService.pointsLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            points: 10,
          }),
        }),
      );
    });
  });

  describe('getUserAchievements', () => {
    it('should return user achievements sorted by unlock date', async () => {
      const mockAchievements = [
        {
          id: 'ua-1',
          userId: 'user-1',
          achievementId: 'ach-1',
          unlockedAt: new Date(),
          achievement: { name: 'First Step', type: 'MILESTONE' },
        },
      ];

      mockPrismaService.userAchievement.findMany.mockResolvedValue(mockAchievements);

      const result = await service.getUserAchievements('user-1');

      expect(result).toEqual(mockAchievements);
      expect(mockPrismaService.userAchievement.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      });
    });
  });

  describe('getAllAchievements', () => {
    it('should return all achievement definitions ordered by type and point value', async () => {
      const mockAchievements = [
        { id: 'ach-1', name: 'First Step', type: 'MILESTONE', pointValue: 10 },
        { id: 'ach-2', name: 'First Post', type: 'SOCIAL', pointValue: 10 },
      ];

      mockPrismaService.achievement.findMany.mockResolvedValue(mockAchievements);

      const result = await service.getAllAchievements();

      expect(result).toEqual(mockAchievements);
      expect(mockPrismaService.achievement.findMany).toHaveBeenCalledWith({
        orderBy: [{ type: 'asc' }, { pointValue: 'asc' }],
      });
    });
  });
});
