import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { PrismaService } from '../prisma.service';

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
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    pointsLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: mockPrismaService },
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

      mockPrismaService.resource.findMany.mockResolvedValue(mockResources);
      mockPrismaService.resource.count.mockResolvedValue(1);

      const result = await service.getResources(userId, filters);

      expect(result.data[0].state).toBe('LOCKED');
    });
  });

  describe('completeResource', () => {
    it('should mark resource as complete and award points', async () => {
      const userId = '123';
      const resourceId = 'res-1';

      const mockResource = {
        id: resourceId,
        pointValue: 100,
      };

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);
      mockPrismaService.resourceProgress.findFirst.mockResolvedValue(null);
      mockPrismaService.resourceProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        state: 'COMPLETED',
        completedAt: new Date(),
      });

      const result = await service.markComplete(resourceId, userId);

      expect(result).toHaveProperty('completedAt');
      expect(result.state).toBe('COMPLETED');
      expect(mockPrismaService.pointsLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          points: 100,
          eventType: 'RESOURCE_COMPLETE',
        }),
      });
    });

    it('should not award points if already completed', async () => {
      const userId = '123';
      const resourceId = 'res-1';

      const mockResource = {
        id: resourceId,
        pointValue: 100,
      };

      mockPrismaService.resource.findUnique.mockResolvedValue(mockResource);
      mockPrismaService.resourceProgress.findFirst.mockResolvedValue({
        state: 'COMPLETED',
      });
      mockPrismaService.resourceProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        state: 'COMPLETED',
      });

      await service.markComplete(resourceId, userId);

      expect(mockPrismaService.pointsLog.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if resource does not exist', async () => {
      mockPrismaService.resource.findUnique.mockResolvedValue(null);

      await expect(
        service.markComplete('nonexistent', '123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
