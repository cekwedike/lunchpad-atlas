import { CohortState, UserRole } from '@prisma/client';
import {
  isCohortInActiveWeeklyDigestWindow,
  PrismaWeeklyDigestClient,
  resolveCohortForWeeklyDigest,
  utcDayStart,
} from './weekly-digest-eligibility';

describe('utcDayStart', () => {
  it('normalizes to UTC midnight for the calendar day', () => {
    const d = new Date('2026-06-15T18:30:00.000Z');
    expect(utcDayStart(d).toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });
});

describe('isCohortInActiveWeeklyDigestWindow', () => {
  const base = {
    startDate: new Date('2026-01-10T00:00:00.000Z'),
    endDate: new Date('2026-01-20T23:59:59.000Z'),
    state: CohortState.ACTIVE,
    timeZone: 'UTC',
  };

  it('returns false when cohort is not ACTIVE', () => {
    expect(
      isCohortInActiveWeeklyDigestWindow(
        { ...base, state: CohortState.PENDING },
        new Date('2026-01-15T12:00:00.000Z'),
      ),
    ).toBe(false);
    expect(
      isCohortInActiveWeeklyDigestWindow(
        { ...base, state: CohortState.COMPLETED },
        new Date('2026-01-15T12:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('returns false before start date (UTC day)', () => {
    expect(
      isCohortInActiveWeeklyDigestWindow(
        base,
        new Date('2026-01-09T23:59:59.000Z'),
      ),
    ).toBe(false);
  });

  it('returns true on first day of program', () => {
    expect(
      isCohortInActiveWeeklyDigestWindow(
        base,
        new Date('2026-01-10T08:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('returns true on last day of program', () => {
    expect(
      isCohortInActiveWeeklyDigestWindow(
        base,
        new Date('2026-01-20T12:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('returns false after end date (UTC day)', () => {
    expect(
      isCohortInActiveWeeklyDigestWindow(
        base,
        new Date('2026-01-21T00:00:00.000Z'),
      ),
    ).toBe(false);
  });
});

describe('resolveCohortForWeeklyDigest', () => {
  const activeCohort = {
    id: 'cohort-1',
    name: 'Test',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    state: CohortState.ACTIVE,
    timeZone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const now = new Date('2026-06-01T12:00:00.000Z');

  function makePrisma(overrides: {
    cohort?: { findUnique: jest.Mock };
    session?: { count: jest.Mock };
    cohortFacilitator?: { findMany: jest.Mock };
  }) {
    return {
      cohort: { findUnique: jest.fn(), ...overrides.cohort },
      session: { count: jest.fn().mockResolvedValue(1), ...overrides.session },
      cohortFacilitator: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.cohortFacilitator,
      },
    };
  }

  it('returns null for FELLOW without cohortId', async () => {
    const prisma = makePrisma({});
    await expect(
      resolveCohortForWeeklyDigest(
        prisma as unknown as PrismaWeeklyDigestClient,
        { id: 'u1', role: UserRole.FELLOW, cohortId: null },
        now,
      ),
    ).resolves.toBeNull();
    expect(prisma.cohort.findUnique).not.toHaveBeenCalled();
  });

  it('returns null for ADMIN without cohortId', async () => {
    const prisma = makePrisma({});
    await expect(
      resolveCohortForWeeklyDigest(
        prisma as unknown as PrismaWeeklyDigestClient,
        { id: 'u1', role: UserRole.ADMIN, cohortId: null },
        now,
      ),
    ).resolves.toBeNull();
  });

  it('returns null when no session has occurred yet', async () => {
    const prisma = makePrisma({
      cohort: { findUnique: jest.fn().mockResolvedValue(activeCohort) },
      session: { count: jest.fn().mockResolvedValue(0) },
    });
    await expect(
      resolveCohortForWeeklyDigest(
        prisma as unknown as PrismaWeeklyDigestClient,
        { id: 'u1', role: UserRole.FELLOW, cohortId: 'cohort-1' },
        now,
      ),
    ).resolves.toBeNull();
  });

  it('returns cohort for FELLOW when window and past session pass', async () => {
    const prisma = makePrisma({
      cohort: { findUnique: jest.fn().mockResolvedValue(activeCohort) },
    });
    await expect(
      resolveCohortForWeeklyDigest(
        prisma as unknown as PrismaWeeklyDigestClient,
        { id: 'u1', role: UserRole.FELLOW, cohortId: 'cohort-1' },
        now,
      ),
    ).resolves.toEqual(activeCohort);
  });

  it('for FACILITATOR without cohortId, uses first eligible facilitated cohort', async () => {
    const prisma = makePrisma({
      cohort: { findUnique: jest.fn().mockResolvedValue(activeCohort) },
      cohortFacilitator: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { cohortId: 'cohort-1' },
            { cohortId: 'cohort-2' },
          ]),
      },
    });
    await expect(
      resolveCohortForWeeklyDigest(
        prisma as unknown as PrismaWeeklyDigestClient,
        { id: 'f1', role: UserRole.FACILITATOR, cohortId: null },
        now,
      ),
    ).resolves.toEqual(activeCohort);
    expect(prisma.cohortFacilitator.findMany).toHaveBeenCalled();
  });
});
