import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma.service';

describe('AttendanceService', () => {
  let service: AttendanceService;

  const mockPrismaService = {
    session: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    attendance: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    pointsLog: {
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    cohort: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkIn', () => {
    it('should successfully check in a user to a session', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      const mockSession = {
        id: sessionId,
        title: 'Session 1',
        scheduledDate: new Date(Date.now() + 3600000), // 1 hour in future
        cohort: {
          fellows: [{ id: userId }],
        },
      };

      const mockAttendance = {
        id: 'attendance-1',
        userId,
        sessionId,
        checkInTime: new Date(),
        isLate: false,
        user: { id: userId, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        session: { id: sessionId, title: 'Session 1', sessionNumber: 1, scheduledDate: mockSession.scheduledDate },
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.attendance.findUnique.mockResolvedValue(null);
      mockPrismaService.attendance.create.mockResolvedValue(mockAttendance);
      mockPrismaService.pointsLog.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.checkIn(userId, sessionId);

      expect(result).toEqual(mockAttendance);
      expect(mockPrismaService.attendance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            sessionId,
            isLate: false,
          }),
        }),
      );
    });

    it('should mark attendance as late when checking in after scheduled time', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      const mockSession = {
        id: sessionId,
        title: 'Session 1',
        scheduledDate: new Date(Date.now() - 3600000), // 1 hour in past
        cohort: {
          fellows: [{ id: userId }],
        },
      };

      const mockAttendance = {
        id: 'attendance-1',
        userId,
        sessionId,
        checkInTime: new Date(),
        isLate: true,
        user: { id: userId, firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
        session: { id: sessionId, title: 'Session 1', sessionNumber: 1, scheduledDate: mockSession.scheduledDate },
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.attendance.findUnique.mockResolvedValue(null);
      mockPrismaService.attendance.create.mockResolvedValue(mockAttendance);
      mockPrismaService.pointsLog.create.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.checkIn(userId, sessionId);

      expect(result.isLate).toBe(true);
      // Late attendance awards 10 points
      expect(mockPrismaService.pointsLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ points: 10 }),
        }),
      );
    });

    it('should throw NotFoundException when session does not exist', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.checkIn('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not in cohort', async () => {
      const mockSession = {
        id: 'session-1',
        scheduledDate: new Date(),
        cohort: { fellows: [] }, // User not in fellows
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      await expect(service.checkIn('user-1', 'session-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user already checked in', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      const mockSession = {
        id: sessionId,
        scheduledDate: new Date(),
        cohort: { fellows: [{ id: userId }] },
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.attendance.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.checkIn(userId, sessionId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut', () => {
    it('should successfully check out a user', async () => {
      const userId = 'user-1';
      const sessionId = 'session-1';

      const mockAttendance = {
        id: 'attendance-1',
        userId,
        sessionId,
        checkInTime: new Date(Date.now() - 3600000),
        checkOutTime: null,
      };

      const updatedAttendance = {
        ...mockAttendance,
        checkOutTime: new Date(),
      };

      mockPrismaService.attendance.findUnique.mockResolvedValue(mockAttendance);
      mockPrismaService.attendance.update.mockResolvedValue(updatedAttendance);

      const result = await service.checkOut(userId, sessionId);

      expect(result.checkOutTime).not.toBeNull();
    });

    it('should throw NotFoundException when attendance record not found', async () => {
      mockPrismaService.attendance.findUnique.mockResolvedValue(null);

      await expect(service.checkOut('user-1', 'session-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user already checked out', async () => {
      mockPrismaService.attendance.findUnique.mockResolvedValue({
        id: 'attendance-1',
        checkOutTime: new Date(),
      });

      await expect(service.checkOut('user-1', 'session-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserAttendance', () => {
    it('should return attendance record with duration when checked out', async () => {
      const checkInTime = new Date(Date.now() - 7200000); // 2 hours ago
      const checkOutTime = new Date(Date.now() - 3600000); // 1 hour ago

      const mockAttendance = {
        id: 'attendance-1',
        userId: 'user-1',
        sessionId: 'session-1',
        checkInTime,
        checkOutTime,
        isLate: false,
        session: { title: 'Session 1', sessionNumber: 1, scheduledDate: new Date() },
      };

      mockPrismaService.attendance.findUnique.mockResolvedValue(mockAttendance);

      const result = await service.getUserAttendance('user-1', 'session-1');

      expect(result).not.toBeNull();
      expect(result!.duration).toBe(60); // 60 minutes
    });

    it('should return null duration when not checked out', async () => {
      const mockAttendance = {
        id: 'attendance-1',
        checkInTime: new Date(),
        checkOutTime: null,
        session: { title: 'Session 1', sessionNumber: 1, scheduledDate: new Date() },
      };

      mockPrismaService.attendance.findUnique.mockResolvedValue(mockAttendance);

      const result = await service.getUserAttendance('user-1', 'session-1');

      expect(result!.duration).toBeNull();
    });

    it('should return null when no attendance record found', async () => {
      mockPrismaService.attendance.findUnique.mockResolvedValue(null);

      const result = await service.getUserAttendance('user-1', 'session-1');

      expect(result).toBeNull();
    });
  });

  describe('getUserAttendanceHistory', () => {
    it('should return attendance history for a user', async () => {
      const mockRecords = [
        {
          id: 'attendance-1',
          userId: 'user-1',
          checkInTime: new Date(),
          checkOutTime: null,
          session: {
            id: 'session-1',
            title: 'Session 1',
            sessionNumber: 1,
            scheduledDate: new Date(),
            cohort: { id: 'cohort-1', name: 'Cohort 1' },
          },
        },
      ];

      mockPrismaService.attendance.findMany.mockResolvedValue(mockRecords);

      const result = await service.getUserAttendanceHistory('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].duration).toBeNull();
    });

    it('should filter by cohortId when provided', async () => {
      mockPrismaService.attendance.findMany.mockResolvedValue([]);

      await service.getUserAttendanceHistory('user-1', 'cohort-1');

      expect(mockPrismaService.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            session: { cohortId: 'cohort-1' },
          }),
        }),
      );
    });
  });

  describe('generateSessionReport', () => {
    it('should generate attendance report for a session', async () => {
      const sessionId = 'session-1';
      const checkIn = new Date(Date.now() - 3600000);
      const checkOut = new Date();

      const mockSession = {
        id: sessionId,
        title: 'Test Session',
        scheduledDate: new Date(),
        cohort: {
          fellows: [
            { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
            { id: 'user-2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com' },
          ],
        },
        attendance: [
          {
            userId: 'user-1',
            checkInTime: checkIn,
            checkOutTime: checkOut,
            isLate: false,
            isExcused: false,
            user: { id: 'user-1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com' },
          },
        ],
      };

      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      const report = await service.generateSessionReport(sessionId);

      expect(report.totalFellows).toBe(2);
      expect(report.attendedCount).toBe(1);
      expect(report.attendanceRate).toBe(50);
      expect(report.attendees).toHaveLength(1);
      expect(report.absentees).toHaveLength(1);
      expect(report.absentees[0].userId).toBe('user-2');
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.generateSessionReport('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCohortAttendanceStats', () => {
    it('should return cohort attendance statistics', async () => {
      const cohortId = 'cohort-1';

      const mockCohort = {
        id: cohortId,
        name: 'Test Cohort',
        fellows: [{ id: 'user-1' }, { id: 'user-2' }],
        sessions: [
          {
            id: 'session-1',
            sessionNumber: 1,
            title: 'Session 1',
            scheduledDate: new Date(),
            attendance: [
              { userId: 'user-1', isLate: false, checkInTime: new Date() },
            ],
          },
        ],
      };

      mockPrismaService.cohort.findUnique.mockResolvedValue(mockCohort);

      const result = await service.getCohortAttendanceStats(cohortId);

      expect(result.totalFellows).toBe(2);
      expect(result.totalSessions).toBe(1);
      expect(result.totalAttendances).toBe(1);
      expect(result.overallAttendanceRate).toBe(50);
    });

    it('should throw NotFoundException when cohort not found', async () => {
      mockPrismaService.cohort.findUnique.mockResolvedValue(null);

      await expect(service.getCohortAttendanceStats('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markExcused', () => {
    it('should update existing attendance record to excused', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';

      const existingAttendance = { id: 'attendance-1', userId, sessionId };
      const updatedAttendance = { ...existingAttendance, isExcused: true, notes: 'Medical' };

      mockPrismaService.attendance.findUnique.mockResolvedValue(existingAttendance);
      mockPrismaService.attendance.update.mockResolvedValue(updatedAttendance);

      const result = await service.markExcused(sessionId, userId, 'Medical');

      expect(result.isExcused).toBe(true);
      expect(mockPrismaService.attendance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isExcused: true, notes: 'Medical' }),
        }),
      );
    });

    it('should create excused absence record when no check-in exists', async () => {
      const sessionId = 'session-1';
      const userId = 'user-1';
      const mockSession = { id: sessionId, scheduledDate: new Date() };

      mockPrismaService.attendance.findUnique.mockResolvedValue(null);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.attendance.create.mockResolvedValue({
        userId,
        sessionId,
        isExcused: true,
      });

      const result = await service.markExcused(sessionId, userId);

      expect(mockPrismaService.attendance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId, sessionId, isExcused: true }),
        }),
      );
    });

    it('should throw NotFoundException when creating excused absence for nonexistent session', async () => {
      mockPrismaService.attendance.findUnique.mockResolvedValue(null);
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      await expect(service.markExcused('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('validateGeolocation', () => {
    it('should return true when user is within radius', () => {
      // Same coordinates
      const result = service.validateGeolocation(51.5074, -0.1278, 51.5074, -0.1278, 100);
      expect(result).toBe(true);
    });

    it('should return false when user is outside radius', () => {
      // London to Paris (~340km apart)
      const result = service.validateGeolocation(51.5074, -0.1278, 48.8566, 2.3522, 100);
      expect(result).toBe(false);
    });
  });
});
