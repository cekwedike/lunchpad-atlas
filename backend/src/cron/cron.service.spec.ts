import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CohortState, UserRole } from '@prisma/client';
import { CronService } from './cron.service';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('CronService.sendWeeklyDigests', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');
  const eligibleCohort = {
    id: 'c-eligible',
    name: 'Eligible',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    state: CohortState.ACTIVE,
    timeZone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let service: CronService;
  let emailService: {
    sendWeeklySummaryEmail: jest.Mock;
    sendNotificationEmail: jest.Mock;
  };
  let prisma: {
    user: { findMany: jest.Mock; count: jest.Mock };
    cohort: { findUnique: jest.Mock };
    session: { count: jest.Mock };
    cohortFacilitator: { findMany: jest.Mock };
    resourceProgress: { count: jest.Mock; groupBy: jest.Mock };
    pointsLog: { aggregate: jest.Mock; groupBy: jest.Mock };
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(now);

    emailService = {
      sendWeeklySummaryEmail: jest.fn().mockResolvedValue(undefined),
      sendNotificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      cohort: { findUnique: jest.fn() },
      session: { count: jest.fn().mockResolvedValue(1) },
      cohortFacilitator: { findMany: jest.fn().mockResolvedValue([]) },
      resourceProgress: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      pointsLog: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { points: 0 } }),
        groupBy: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: NotificationsService, useValue: {} },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((k: string) =>
              k === 'FRONTEND_URL' ? 'https://app.test' : undefined,
            ),
          },
        },
      ],
    }).compile();

    service = module.get(CronService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not email GUEST_FACILITATOR', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'g1',
        email: 'guest@x.com',
        firstName: 'Guest',
        role: UserRole.GUEST_FACILITATOR,
        cohortId: 'c-eligible',
      },
    ]);

    await service.sendWeeklyDigests();

    expect(emailService.sendWeeklySummaryEmail).not.toHaveBeenCalled();
    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    expect(prisma.cohort.findUnique).not.toHaveBeenCalled();
  });

  it('does not email ADMIN with no cohortId (avoids global aggregate regression)', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'a1',
        email: 'admin@x.com',
        firstName: 'Admin',
        role: UserRole.ADMIN,
        cohortId: null,
      },
    ]);

    await service.sendWeeklyDigests();

    expect(emailService.sendNotificationEmail).not.toHaveBeenCalled();
    expect(prisma.pointsLog.aggregate).not.toHaveBeenCalled();
    expect(prisma.resourceProgress.groupBy).not.toHaveBeenCalled();
  });

  it('sends weekly summary to FELLOW when cohort is eligible', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'f1',
        email: 'fellow@x.com',
        firstName: 'Pat',
        role: UserRole.FELLOW,
        cohortId: 'c-eligible',
      },
    ]);
    prisma.cohort.findUnique.mockResolvedValue(eligibleCohort);
    prisma.pointsLog.groupBy.mockResolvedValue([
      { userId: 'f1', _sum: { points: 5 } },
    ]);
    prisma.user.count.mockResolvedValue(3);

    await service.sendWeeklyDigests();

    expect(emailService.sendWeeklySummaryEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendWeeklySummaryEmail).toHaveBeenCalledWith(
      'fellow@x.com',
      expect.objectContaining({
        firstName: 'Pat',
        rank: 1,
        totalParticipants: 3,
      }),
    );
    expect(prisma.pointsLog.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { cohortId: 'c-eligible', role: 'FELLOW' },
        }),
      }),
    );
  });

  it('sends cohort summary scoped to resolved cohort for FACILITATOR', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'fac1',
        email: 'fac@x.com',
        firstName: 'Sam',
        role: UserRole.FACILITATOR,
        cohortId: null,
      },
    ]);
    prisma.cohortFacilitator.findMany.mockResolvedValue([
      { cohortId: 'c-eligible' },
    ]);
    prisma.cohort.findUnique.mockResolvedValue(eligibleCohort);

    await service.sendWeeklyDigests();

    expect(emailService.sendNotificationEmail).toHaveBeenCalledTimes(1);
    expect(prisma.resourceProgress.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { cohortId: 'c-eligible', role: 'FELLOW' },
        }),
      }),
    );
  });
});
