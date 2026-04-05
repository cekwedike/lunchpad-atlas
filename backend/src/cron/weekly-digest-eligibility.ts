import { Cohort, CohortState, UserRole } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import { PrismaService } from '../prisma.service';

/** UTC midnight for the calendar day of `d` (legacy tests / UTC cohorts). */
export function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export function resolveCohortTimeZone(cohort: {
  timeZone?: string | null;
}): string {
  const tz = (cohort.timeZone ?? 'UTC').trim() || 'UTC';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/** Calendar date YYYY-MM-DD for `date` in the given IANA time zone. */
export function calendarYmdInTimeZone(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
}

/** Next calendar day after `ymd` (YYYY-MM-DD), pure date arithmetic. */
export function nextCalendarYmd(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const y2 = dt.getUTCFullYear();
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(dt.getUTCDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}

export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y2 = dt.getUTCFullYear();
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(dt.getUTCDate()).padStart(2, '0');
  return `${y2}-${m2}-${d2}`;
}

/**
 * Cohort is ACTIVE and "today" in the cohort's time zone is between start and
 * end calendar dates (inclusive), using the same zone for all three.
 */
export function isCohortInActiveWeeklyDigestWindow(
  cohort: Pick<Cohort, 'startDate' | 'endDate' | 'state' | 'timeZone'>,
  now: Date,
): boolean {
  if (cohort.state !== CohortState.ACTIVE) return false;
  const tz = resolveCohortTimeZone(cohort);
  const nowYmd = calendarYmdInTimeZone(now, tz);
  const startYmd = calendarYmdInTimeZone(cohort.startDate, tz);
  const endYmd = calendarYmdInTimeZone(cohort.endDate, tz);
  return nowYmd >= startYmd && nowYmd <= endYmd;
}

export type WeeklyDigestUserPick = {
  id: string;
  role: UserRole;
  cohortId: string | null;
};

export type PrismaWeeklyDigestClient = Pick<
  PrismaService,
  'cohort' | 'session' | 'cohortFacilitator'
>;

/**
 * Resolves the cohort used for weekly digest stats and eligibility.
 * Requires at least one session with scheduledDate strictly before `now` so we
 * do not email "this week in the program" before any session has occurred.
 */
export async function resolveCohortForWeeklyDigest(
  prisma: PrismaWeeklyDigestClient,
  user: WeeklyDigestUserPick,
  now: Date,
): Promise<Cohort | null> {
  const tryCohort = async (cohortId: string): Promise<Cohort | null> => {
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) return null;
    if (!isCohortInActiveWeeklyDigestWindow(cohort, now)) return null;
    const pastCount = await prisma.session.count({
      where: { cohortId, scheduledDate: { lt: now } },
    });
    if (pastCount === 0) return null;
    return cohort;
  };

  switch (user.role) {
    case UserRole.FELLOW:
      if (!user.cohortId) return null;
      return tryCohort(user.cohortId);
    case UserRole.ADMIN:
      if (!user.cohortId) return null;
      return tryCohort(user.cohortId);
    case UserRole.FACILITATOR: {
      if (user.cohortId) {
        const primary = await tryCohort(user.cohortId);
        if (primary) return primary;
      }
      const links = await prisma.cohortFacilitator.findMany({
        where: { userId: user.id },
        select: { cohortId: true },
        orderBy: { cohortId: 'asc' },
      });
      for (const { cohortId } of links) {
        const c = await tryCohort(cohortId);
        if (c) return c;
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * Whether a fellow's cohort is in the active program date window (no "past
 * session" requirement). Used for inactivity nudges and date-based unlocks.
 */
export async function isFellowCohortInActiveProgramWindow(
  prisma: Pick<PrismaService, 'cohort'>,
  cohortId: string,
  now: Date,
): Promise<boolean> {
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort) return false;
  return isCohortInActiveWeeklyDigestWindow(cohort, now);
}
