import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    resourceProgress: {
      count: jest.fn(),
    },
    discussion: {
      count: jest.fn(),
    },
    quizResponse: {
      count: jest.fn(),
    },
    pointsLog: {
      aggregate: jest.fn(),
    },
    userAchievement: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile with composed name', async () => {
      const userId = '123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FELLOW',
        cohortId: 'cohort-123',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(userId);

      expect(result).toEqual({
        ...mockUser,
        name: 'John Doe',
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        }),
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserStats', () => {
    it('should return aggregated user statistics', async () => {
      const userId = '123';

      mockPrismaService.resourceProgress.count.mockResolvedValue(5);
      mockPrismaService.discussion.count.mockResolvedValue(3);
      mockPrismaService.quizResponse.count.mockResolvedValue(2);
      mockPrismaService.pointsLog.aggregate.mockResolvedValue({
        _sum: { points: 450 },
      });

      const result = await service.getUserStats(userId);

      expect(result).toEqual({
        resourcesCompleted: 5,
        discussionsPosted: 3,
        quizzesTaken: 2,
        totalPoints: 450,
        currentStreak: 0,
      });
    });

    it('should return 0 total points when user has no points', async () => {
      const userId = '123';

      mockPrismaService.resourceProgress.count.mockResolvedValue(0);
      mockPrismaService.discussion.count.mockResolvedValue(0);
      mockPrismaService.quizResponse.count.mockResolvedValue(0);
      mockPrismaService.pointsLog.aggregate.mockResolvedValue({
        _sum: { points: null },
      });

      const result = await service.getUserStats(userId);

      expect(result.totalPoints).toBe(0);
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const userId = '123';
      const updateDto = {
        name: 'Jane Smith',
        bio: 'Software Developer',
      };

      const mockUpdatedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'FELLOW',
        cohortId: null,
        createdAt: new Date(),
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.updateProfile(userId, updateDto);

      expect(result).toEqual({
        ...mockUpdatedUser,
        name: 'Jane Smith',
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
        }),
        select: expect.any(Object),
      });
    });
  });

  describe('getUserAchievements', () => {
    it('should return list of user achievements', async () => {
      const userId = '123';
      const mockAchievements = [
        {
          id: '1',
          achievementId: 'ach-1',
          userId,
          unlockedAt: new Date(),
          achievement: {
            name: 'First Steps',
            description: 'Complete your first resource',
            type: 'MILESTONE',
            imageUrl: '/badges/first-steps.png',
          },
        },
      ];

      mockPrismaService.userAchievement.findMany.mockResolvedValue(
        mockAchievements,
      );

      const result = await service.getUserAchievements(userId);

      expect(result).toEqual(mockAchievements);
      expect(mockPrismaService.userAchievement.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { achievement: true },
        orderBy: { unlockedAt: 'desc' },
      });
    });
  });
});
