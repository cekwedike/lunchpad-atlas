import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';
import { SessionAnalyticsService } from '../session-analytics/session-analytics.service';
import { PointsService } from '../gamification/points.service';

describe('AdminService', () => {
  let service: AdminService;

  const mockPrismaService = {
    cohort: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    resource: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    adminAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    pointsLog: {
      groupBy: jest.fn(),
    },
    cohortFacilitator: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockNotificationsService = {
    notifyAdminsCohortUpdated: jest.fn().mockResolvedValue(undefined),
    notifyAdminsSessionUpdated: jest.fn().mockResolvedValue(undefined),
    notifyAdminsResourceUpdated: jest.fn().mockResolvedValue(undefined),
    notifyAdminsUserRegistered: jest.fn().mockResolvedValue(undefined),
    notifyAdminsUserUpdated: jest.fn().mockResolvedValue(undefined),
  };

  const mockChatService = {
    createChannel: jest.fn().mockResolvedValue({ id: 'channel-1' }),
  };

  const mockSessionAnalyticsService = {
    recordEvent: jest.fn().mockResolvedValue(undefined),
  };

  const mockPointsService = {
    awardPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ChatService, useValue: mockChatService },
        { provide: SessionAnalyticsService, useValue: mockSessionAnalyticsService },
        { provide: PointsService, useValue: mockPointsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCohorts', () => {
    it('should return all cohorts with fellow counts', async () => {
      const mockCohorts = [
        {
          id: 'cohort-1',
          name: 'Cohort 1',
          startDate: new Date(),
          endDate: new Date(),
          _count: { sessions: 3 },
          facilitators: [],
        },
      ];

      mockPrismaService.cohort.findMany.mockResolvedValue(mockCohorts);
      mockPrismaService.user.groupBy.mockResolvedValue([
        { cohortId: 'cohort-1', _count: { id: 5 } },
      ]);

      const result = await service.getAllCohorts();

      expect(result).toHaveLength(1);
      expect(result[0]._count.fellows).toBe(5);
    });

    it('should return empty array when no cohorts exist', async () => {
      mockPrismaService.cohort.findMany.mockResolvedValue([]);

      const result = await service.getAllCohorts();

      expect(result).toEqual([]);
    });
  });

  describe('getCohortMembers', () => {
    it('should return members for an admin requester', async () => {
      const mockMembers = [
        { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', role: 'FELLOW' },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue({ role: 'ADMIN', cohortId: null });
      mockPrismaService.user.findMany.mockResolvedValue(mockMembers);
      mockPrismaService.pointsLog.groupBy.mockResolvedValue([]);

      const result = await service.getCohortMembers('cohort-1', 'admin-1');

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException for fellow accessing different cohort', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FELLOW',
        cohortId: 'cohort-2',
      });

      await expect(service.getCohortMembers('cohort-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when requester not authenticated', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCohortMembers('cohort-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createCohort', () => {
    it('should create a cohort and auto-create chat channel', async () => {
      const dto = {
        name: 'New Cohort',
        startDate: '2025-01-01',
        endDate: '2025-06-30',
      };

      const mockCohort = {
        id: 'cohort-new',
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        state: 'ACTIVE',
      };

      mockPrismaService.cohort.create.mockResolvedValue(mockCohort);
      mockPrismaService.adminAuditLog.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue({
        firstName: 'Admin',
        lastName: 'User',
      });

      const result = await service.createCohort(dto as any, 'admin-1');

      expect(result).toEqual(mockCohort);
      expect(mockChatService.createChannel).toHaveBeenCalledWith(
        expect.objectContaining({
          cohortId: mockCohort.id,
          type: 'COHORT_WIDE',
        }),
        'admin-1',
      );
      expect(mockNotificationsService.notifyAdminsCohortUpdated).toHaveBeenCalled();
    });
  });

  describe('updateCohort', () => {
    it('should update cohort and notify admins', async () => {
      const cohortId = 'cohort-1';
      const dto = { name: 'Updated Cohort Name' };

      const existingCohort = {
        id: cohortId,
        name: 'Old Name',
        startDate: new Date(),
        endDate: new Date(),
      };

      const updatedCohort = { ...existingCohort, name: dto.name };

      mockPrismaService.cohort.findUnique.mockResolvedValue(existingCohort);
      mockPrismaService.cohort.update.mockResolvedValue(updatedCohort);
      mockPrismaService.adminAuditLog.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue({
        firstName: 'Admin',
        lastName: 'User',
      });

      const result = await service.updateCohort(cohortId, dto as any, 'admin-1');

      expect(result.name).toBe(dto.name);
      expect(mockNotificationsService.notifyAdminsCohortUpdated).toHaveBeenCalled();
    });

    it('should throw NotFoundException when cohort does not exist', async () => {
      mockPrismaService.cohort.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCohort('nonexistent', { name: 'Test' } as any, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCohort', () => {
    it('should delete cohort and all its users', async () => {
      const cohortId = 'cohort-1';
      const mockCohort = {
        id: cohortId,
        name: 'Test Cohort',
        fellows: [
          { id: 'user-1', email: 'user1@test.com', firstName: 'Alice', lastName: 'Smith' },
        ],
      };

      mockPrismaService.cohort.findUnique.mockResolvedValue(mockCohort);
      mockPrismaService.user.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.cohort.delete.mockResolvedValue(mockCohort);
      mockPrismaService.adminAuditLog.create.mockResolvedValue({});

      const result = await service.deleteCohort(cohortId, 'admin-1');

      expect(result.deletedUsersCount).toBe(1);
      expect(mockPrismaService.user.deleteMany).toHaveBeenCalledWith({
        where: { cohortId },
      });
      expect(mockPrismaService.cohort.delete).toHaveBeenCalledWith({
        where: { id: cohortId },
      });
    });

    it('should throw NotFoundException when cohort does not exist', async () => {
      mockPrismaService.cohort.findUnique.mockResolvedValue(null);

      await expect(service.deleteCohort('nonexistent', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSession', () => {
    it('should update a session and notify admins', async () => {
      const sessionId = 'session-1';
      const dto = { title: 'Updated Session Title' };

      const existingSession = {
        id: sessionId,
        title: 'Old Title',
        cohortId: 'cohort-1',
      };

      const updatedSession = { ...existingSession, title: dto.title };

      mockPrismaService.session.findUnique.mockResolvedValue(existingSession);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ role: 'ADMIN', cohortId: null })
        .mockResolvedValueOnce({ firstName: 'Admin', lastName: 'User' });
      mockPrismaService.session.update.mockResolvedValue(updatedSession);
      mockPrismaService.adminAuditLog.create.mockResolvedValue({});

      const result = await service.updateSession(sessionId, dto as any, 'admin-1');

      expect(result.title).toBe(dto.title);
      expect(mockNotificationsService.notifyAdminsSessionUpdated).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSession('nonexistent', { title: 'Test' } as any, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for facilitator editing different cohort session', async () => {
      const existingSession = {
        id: 'session-1',
        title: 'Session',
        cohortId: 'cohort-1',
      };

      mockPrismaService.session.findUnique.mockResolvedValue(existingSession);
      mockPrismaService.user.findUnique.mockResolvedValue({
        role: 'FACILITATOR',
        cohortId: 'cohort-2', // Different cohort
      });

      await expect(
        service.updateSession('session-1', { title: 'New' } as any, 'facilitator-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = [
        { id: 'log-1', adminId: 'admin-1', action: 'CREATE_COHORT', createdAt: new Date() },
      ];

      mockPrismaService.adminAuditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.adminAuditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs(1, 50);

      expect(result.data).toEqual(mockLogs);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getPlatformMetrics', () => {
    it('should return aggregated platform metrics', async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(50)  // activeFellows
        .mockResolvedValueOnce(75)  // fellowCount
        .mockResolvedValueOnce(5)   // facilitatorCount
        .mockResolvedValueOnce(3)   // adminCount
        .mockResolvedValueOnce(10)  // newUsersThisWeek
        .mockResolvedValueOnce(8);  // newUsersLastWeek

      mockPrismaService.resource.count.mockResolvedValue(200);
      mockPrismaService.cohort.count.mockResolvedValue(4);

      const result = await service.getPlatformMetrics();

      expect(result).toMatchObject({
        totalUsers: 100,
        activeUsers: 50,
        resourceCount: 200,
        cohortCount: 4,
      });
    });
  });
});
