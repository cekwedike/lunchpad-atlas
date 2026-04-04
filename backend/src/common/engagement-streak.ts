import { PrismaService } from '../prisma.service';

/**
 * Consecutive calendar days with at least one engagement-style points event,
 * aligned with leaderboard streak semantics (must include today or yesterday).
 */
export async function computeEngagementDayStreak(
  prisma: PrismaService,
  userId: string,
): Promise<number> {
  const events = await prisma.pointsLog.findMany({
    where: {
      userId,
      eventType: {
        in: ['RESOURCE_COMPLETE', 'QUIZ_SUBMIT', 'DISCUSSION_POST'],
      },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  if (events.length === 0) return 0;

  const uniqueDays = new Set<string>();
  for (const event of events) {
    const date = new Date(event.createdAt);
    date.setHours(0, 0, 0, 0);
    uniqueDays.add(date.toISOString().split('T')[0]);
  }

  const sortedDays = Array.from(uniqueDays).sort().reverse();
  if (sortedDays.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (sortedDays[0] !== todayStr && sortedDays[0] !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let expectedDate = new Date(sortedDays[0]);
  for (const dayStr of sortedDays) {
    const currentDay = new Date(dayStr);
    const diffDays = Math.floor(
      (expectedDate.getTime() - currentDay.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) {
      streak++;
      expectedDate = new Date(currentDay);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
