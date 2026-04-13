import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PointsService } from '../gamification/points.service';

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    pointsLog: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    chatMessage: {
      findMany: jest.fn(),
    },
    discussionComment: {
      findMany: jest.fn(),
    },
    cohort: {
      findUnique: jest.fn(),
    },
    cohortFacilitator: {
      findFirst: jest.fn(),
    },
    guestSession: {
      findFirst: jest.fn(),
    },
  };

  const mockNotificationsService = {
    notifyPointsAdjusted: jest.fn(),
  };

  const mockPointsService = {
    awardPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: PointsService, useValue: mockPointsService },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should return paginated leaderboard with ranked fellows', async () => {
      const mockFellows = [
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', cohortId: 'cohort-1' },
        { id: 'user-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com', cohortId: 'cohort-1' },
      ];

      const mockPointsData = [
        { userId: 'user-1', _sum: { points: 500 } },
        { userId: 'user-2', _sum: { points: 300 } },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockFellows);
      mockPrismaService.pointsLog.groupBy.mockResolvedValue(mockPointsData);
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);
      mockPrismaService.discussionComment.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLog.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard('admin-1', 'ADMIN', { page: 1, limit: 20 });

      expect(result).toMatchObject({
        total: 2,
        page: 1,
        limit: 20,
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].rank).toBe(1);
      expect(result.data[0].userId).toBe('user-1');
      expect(result.data[0].points).toBe(500);
    });

    it('should return empty leaderboard when no fellows exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard('admin-1', 'ADMIN', { page: 1, limit: 20 });

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('should filter by cohortId when provided', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getLeaderboard('admin-1', 'ADMIN', {
        cohortId: 'cohort-1',
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ cohortId: 'cohort-1', role: 'FELLOW' }),
        }),
      );
    });

    it('should include streak bonuses in total points', async () => {
      const now = new Date();
      // Create dates for last 8 consecutive days
      const days = Array.from({ length: 8 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        return { userId: 'user-1', createdAt: d };
      });

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'a@t.com', cohortId: 'c-1' },
      ]);
      mockPrismaService.pointsLog.groupBy.mockResolvedValue([
        { userId: 'user-1', _sum: { points: 100 } },
      ]);
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);
      mockPrismaService.discussionComment.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLog.findMany.mockResolvedValue(days);

      const result = await service.getLeaderboard('admin-1', 'ADMIN', { page: 1, limit: 20 });

      // User should have base points + streak bonus (streak >= 7 = +10)
      expect(result.data[0].basePoints).toBe(100);
      expect(result.data[0].streak).toBe(8);
      expect(result.data[0].streakBonus).toBe(10);
      expect(result.data[0].points).toBe(110);
    });

    it('should require cohortId for facilitators', async () => {
      await expect(
        service.getLeaderboard('fac-1', 'FACILITATOR', { page: 1, limit: 20 }),
      ).rejects.toThrow('cohortId query parameter is required');
    });

    it('should apply deterministic tie-breakers: streak, base points, then name', async () => {
      const now = new Date();
      const isoDay = (dayOffset: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() - dayOffset);
        d.setHours(12, 0, 0, 0);
        return d;
      };

      const mockFellows = [
        {
          id: 'u-b',
          firstName: 'Bola',
          lastName: 'Abe',
          email: 'bola@test.com',
          cohortId: 'cohort-1',
        },
        {
          id: 'u-a',
          firstName: 'Akin',
          lastName: 'Zed',
          email: 'akin@test.com',
          cohortId: 'cohort-1',
        },
        {
          id: 'u-c',
          firstName: 'Chike',
          lastName: 'Ade',
          email: 'chike@test.com',
          cohortId: 'cohort-1',
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockFellows);
      mockPrismaService.pointsLog.groupBy.mockResolvedValue([
        { userId: 'u-b', _sum: { points: 100 } },
        { userId: 'u-a', _sum: { points: 110 } },
        { userId: 'u-c', _sum: { points: 115 } },
      ]);
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);
      mockPrismaService.discussionComment.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLog.findMany.mockResolvedValue([
        // u-b streak = 7 days (+10 bonus) => total 110
        { userId: 'u-b', createdAt: isoDay(0) },
        { userId: 'u-b', createdAt: isoDay(1) },
        { userId: 'u-b', createdAt: isoDay(2) },
        { userId: 'u-b', createdAt: isoDay(3) },
        { userId: 'u-b', createdAt: isoDay(4) },
        { userId: 'u-b', createdAt: isoDay(5) },
        { userId: 'u-b', createdAt: isoDay(6) },
        // u-a streak = 2 days (+0 bonus) => total 110
        { userId: 'u-a', createdAt: isoDay(0) },
        { userId: 'u-a', createdAt: isoDay(1) },
        // u-c no streak bonus threshold => total 115
        { userId: 'u-c', createdAt: isoDay(4) },
      ]);

      const result = await service.getLeaderboard('admin-1', 'ADMIN', { page: 1, limit: 20 });

      expect(result.data.map((row) => row.userId)).toEqual(['u-c', 'u-b', 'u-a']);
    });
  });

  describe('getUserRank', () => {
    it('should return rank info for a fellow user', async () => {
      const userId = 'user-1';
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: userId,
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@test.com',
          role: 'FELLOW',
        })
        .mockResolvedValueOnce({ cohortId: 'cohort-1' });
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: userId, firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
      ]);
      mockPrismaService.pointsLog.groupBy.mockResolvedValue([
        { userId, _sum: { points: 500 } },
      ]);
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);
      mockPrismaService.discussionComment.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLog.findMany.mockResolvedValue([]);

      const result = await service.getUserRank(userId, 'FELLOW', {});

      expect(result).toMatchObject({
        rank: 1,
        userId,
        points: 500,
      });
    });

    it('should return non-ranked result for non-FELLOW users', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'admin-1',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        role: 'ADMIN',
      });

      const result = await service.getUserRank('admin-1', 'ADMIN', {});

      expect(result).toMatchObject({
        rank: null,
        message: 'Only fellows appear on the leaderboard',
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserRank('nonexistent', 'FELLOW', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle case when user has no activity in period', async () => {
      const userId = 'user-1';
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: userId,
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@test.com',
          role: 'FELLOW',
        })
        .mockResolvedValueOnce({ cohortId: 'cohort-1' });
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
      ]);
      mockPrismaService.pointsLog.groupBy.mockResolvedValue([]);
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);
      mockPrismaService.discussionComment.findMany.mockResolvedValue([]);
      mockPrismaService.pointsLog.findMany.mockResolvedValue([]);

      const result = await service.getUserRank(userId, 'FELLOW', {});

      expect(result).toMatchObject({
        rank: null,
        message: 'User has no activity in this period',
      });
    });
  });

  describe('adjustPoints', () => {
    it('should successfully adjust points for a fellow', async () => {
      const adjustedById = 'admin-1';
      const dto = { userId: 'user-1', points: 50, description: "Manual adjustment" };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          role: 'FELLOW',
          cohortId: 'cohort-1',
          currentMonthPoints: 100,
          lastPointReset: new Date(),
        })
        .mockResolvedValueOnce({
          firstName: 'Admin',
          lastName: 'User',
        });

      mockPointsService.awardPoints.mockResolvedValue({
        awarded: true,
        capped: false,
        monthResetApplied: false,
      });
      mockNotificationsService.notifyPointsAdjusted.mockResolvedValue(undefined);

      const result = await service.adjustPoints(adjustedById, 'ADMIN', dto);

      expect(result).toEqual({ success: true, capped: false });
      expect(mockPointsService.awardPoints).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          points: 50,
          eventType: 'ADMIN_ADJUSTMENT',
        }),
      );
    });

    it('should throw BadRequestException when points is zero', async () => {
      await expect(
        service.adjustPoints('admin-1', 'ADMIN', { userId: 'user-1', points: 0 , description: "Manual adjustment" }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when target user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.adjustPoints('admin-1', 'ADMIN', { userId: 'nonexistent', points: 50 , description: "Manual adjustment" }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when target is not a fellow', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'admin-2',
        role: 'ADMIN',
        cohortId: null,
      });

      await expect(
        service.adjustPoints('admin-1', 'ADMIN', { userId: 'admin-2', points: 50 , description: "Manual adjustment" }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if facilitator adjusting points for fellow in different cohort', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: 'FELLOW',
        cohortId: 'cohort-1',
        currentMonthPoints: 0,
        lastPointReset: new Date(),
      });
      mockPrismaService.cohortFacilitator.findFirst.mockResolvedValue(null);

      await expect(
        service.adjustPoints('facilitator-1', 'FACILITATOR', { userId: 'user-1', points: 10 , description: "Manual adjustment" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAvailableMonths', () => {
    it('should return empty months when user has no cohort', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: null });

      const result = await service.getAvailableMonths('user-1', 'FELLOW');

      expect(result).toEqual({ months: [] });
    });

    it('should return months for cohort range', async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      mockPrismaService.cohort.findUnique.mockResolvedValue({
        id: 'cohort-1',
        startDate,
        endDate,
      });

      const result = await service.getAvailableMonths('user-1', 'FELLOW', 'cohort-1');

      expect(result.months).toBeInstanceOf(Array);
      expect(result.months.length).toBeGreaterThan(0);
      result.months.forEach((m) => {
        expect(m).toHaveProperty('month');
        expect(m).toHaveProperty('year');
        expect(m).toHaveProperty('label');
      });
    });

    it('should return empty months when cohort does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ cohortId: 'cohort-1' });
      mockPrismaService.cohort.findUnique.mockResolvedValue(null);

      const result = await service.getAvailableMonths('user-1', 'FELLOW', 'cohort-1');

      expect(result).toEqual({ months: [] });
    });
  });
});
