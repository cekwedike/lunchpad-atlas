import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Archive monthly leaderboard and reset monthly points.
   * Runs at 00:00 UTC on the 1st of every month.
   */
  @Cron('0 0 1 * *')
  async archiveMonthlyLeaderboard() {
    this.logger.log('Running monthly leaderboard archival...');

    const now = new Date();
    // Use previous month for archiving (job runs on 1st of new month)
    const archiveDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = archiveDate.getMonth() + 1; // 1-12
    const year = archiveDate.getFullYear();
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const activeCohorts = await this.prisma.cohort.findMany({
      where: { state: 'ACTIVE' },
      select: { id: true, name: true },
    });

    for (const cohort of activeCohorts) {
      try {
        // Skip if already archived for this month
        const existing = await this.prisma.monthlyLeaderboard.findUnique({
          where: { cohortId_month_year: { cohortId: cohort.id, month, year } },
        });
        if (existing) continue;

        // Get fellows ranked by points earned this month
        const pointsThisMonth = await this.prisma.pointsLog.groupBy({
          by: ['userId'],
          where: {
            user: { cohortId: cohort.id, role: 'FELLOW' },
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { points: true },
          orderBy: { _sum: { points: 'desc' } },
        });

        const leaderboard = await this.prisma.monthlyLeaderboard.create({
          data: { cohortId: cohort.id, month, year, startDate, endDate },
        });

        const rankedEntries = pointsThisMonth.map((p, index) => ({
          leaderboardId: leaderboard.id,
          userId: p.userId,
          rank: index + 1,
          totalPoints: p._sum.points ?? 0,
        }));

        if (rankedEntries.length > 0) {
          await this.prisma.leaderboardEntry.createMany({ data: rankedEntries });

          // Award rank-based achievements for fellows who placed in top positions.
          // These are checked here (not in checkAndAwardAchievements) because rank
          // is a "≤" comparison and is only known at month-end.
          const rankAchievements = await this.prisma.achievement.findMany({
            where: { name: { in: ['Monthly Champion', 'Top 10 Finisher'] } },
            select: { id: true, name: true, pointValue: true },
          });

          for (const entry of rankedEntries) {
            for (const ach of rankAchievements) {
              const maxRank = ach.name === 'Monthly Champion' ? 1 : 10;
              if (entry.rank > maxRank) continue;

              const alreadyUnlocked = await this.prisma.userAchievement.findUnique({
                where: {
                  userId_achievementId: { userId: entry.userId, achievementId: ach.id },
                },
              });
              if (alreadyUnlocked) continue;

              await this.prisma.userAchievement.create({
                data: { userId: entry.userId, achievementId: ach.id, unlockedAt: new Date() },
              });
              if (ach.pointValue > 0) {
                await this.prisma.pointsLog.create({
                  data: {
                    userId: entry.userId,
                    points: ach.pointValue,
                    eventType: 'ADMIN_ADJUSTMENT' as any,
                    description: `Achievement unlocked: ${ach.name}`,
                  },
                });
              }
            }
          }
        }

        this.logger.log(`Archived leaderboard for cohort ${cohort.name} (${month}/${year})`);
      } catch (err) {
        this.logger.error(`Failed to archive leaderboard for cohort ${cohort.id}: ${err}`);
      }
    }

    // Reset monthly points for all users
    await this.prisma.user.updateMany({
      data: { currentMonthPoints: 0, lastPointReset: now },
    });

    this.logger.log('Monthly leaderboard archival complete. Points reset.');
  }

  /**
   * Send weekly digest emails to opted-in users.
   * Runs every Monday at 08:00 UTC.
   */
  @Cron('0 8 * * 1')
  async sendWeeklyDigests() {
    this.logger.log('Sending weekly digest emails...');

    const users = await this.prisma.user.findMany({
      where: { weeklyDigest: true, isSuspended: false, role: 'FELLOW' },
      select: {
        id: true,
        email: true,
        firstName: true,
        cohortId: true,
        currentMonthPoints: true,
      },
    });

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const now = new Date();
    const weekNumber = Math.ceil(
      (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000),
    );

    let sent = 0;
    for (const user of users) {
      try {
        const [resourcesCompleted, pointsThisWeek, cohortFellowCount, rankEntry] = await Promise.all([
          this.prisma.resourceProgress.count({
            where: { userId: user.id, state: 'COMPLETED', completedAt: { gte: oneWeekAgo } },
          }),
          this.prisma.pointsLog.aggregate({
            where: { userId: user.id, createdAt: { gte: oneWeekAgo } },
            _sum: { points: true },
          }),
          user.cohortId
            ? this.prisma.user.count({ where: { cohortId: user.cohortId, role: 'FELLOW' } })
            : Promise.resolve(1),
          user.cohortId
            ? this.prisma.pointsLog.groupBy({
                by: ['userId'],
                where: { user: { cohortId: user.cohortId }, createdAt: { gte: oneWeekAgo } },
                _sum: { points: true },
                orderBy: { _sum: { points: 'desc' } },
              })
            : Promise.resolve([]),
        ]);

        const weeklyPoints = pointsThisWeek._sum.points ?? 0;
        const rankList = rankEntry as Array<{ userId: string; _sum: { points: number | null } }>;
        const rank = rankList.findIndex((r) => r.userId === user.id) + 1 || 1;

        await this.emailService.sendWeeklySummaryEmail(user.email, {
          firstName: user.firstName,
          weekNumber,
          resourcesCompleted,
          pointsEarned: weeklyPoints,
          rank,
          totalParticipants: cohortFellowCount,
        });

        sent++;
      } catch (err) {
        this.logger.warn(`Failed to send digest to ${user.email}: ${err}`);
      }
    }

    this.logger.log(`Weekly digest sent to ${sent}/${users.length} users`);
  }

  /**
   * Nudge fellows who haven't completed core resources in 3+ days.
   * Runs every day at 09:00 UTC.
   */
  @Cron('0 9 * * *')
  async nudgeInactiveFellows() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const inactiveFellows = await this.prisma.user.findMany({
      where: {
        role: 'FELLOW',
        isSuspended: false,
        emailNotifications: true,
        cohortId: { not: null },
        OR: [
          { lastLoginAt: null },
          { lastLoginAt: { lt: threeDaysAgo } },
        ],
      },
      select: { id: true, email: true, firstName: true, cohortId: true },
    });

    let nudged = 0;
    for (const fellow of inactiveFellows) {
      try {
        await this.emailService.sendNotificationEmail(fellow.email, {
          firstName: fellow.firstName,
          title: "We miss you! Your cohort needs you",
          message: "You haven't been active in a few days. Log in to complete resources, earn points, and keep up with your cohort.",
          actionUrl: `${process.env.FRONTEND_URL}/dashboard/fellow`,
          actionText: 'Get Back On Track',
        });
        nudged++;
      } catch (err) {
        this.logger.warn(`Failed to nudge ${fellow.email}: ${err}`);
      }
    }

    if (nudged > 0) {
      this.logger.log(`Sent nudge emails to ${nudged} inactive fellows`);
    }
  }

  /**
   * Alert staff about fellows who have been inactive for 5+ days.
   * Runs daily at 10:00 UTC (after the 09:00 nudge to fellows).
   */
  @Cron('0 10 * * *')
  async alertStaffInactiveFellows() {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const inactiveFellows = await this.prisma.user.findMany({
      where: {
        role: 'FELLOW',
        isSuspended: false,
        cohortId: { not: null },
        OR: [
          { lastLoginAt: null },
          { lastLoginAt: { lt: fiveDaysAgo } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, cohortId: true, lastLoginAt: true },
    });

    let alerted = 0;
    for (const fellow of inactiveFellows) {
      const daysSince = fellow.lastLoginAt
        ? Math.floor((Date.now() - fellow.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Only alert once per threshold (5, 10, 15 days) to avoid spam
      if (daysSince === 5 || daysSince === 10 || daysSince === 15 || daysSince === 30) {
        try {
          await this.notificationsService.notifyFellowInactivity(
            fellow.id,
            `${fellow.firstName} ${fellow.lastName}`,
            fellow.cohortId!,
            daysSince,
          );
          alerted++;
        } catch {
          // Non-critical
        }
      }
    }

    if (alerted > 0) {
      this.logger.log(`Alerted staff about ${alerted} inactive fellows`);
    }
  }

  /**
   * Alert staff when fellows miss 3+ consecutive sessions.
   * Runs daily at 10:30 UTC.
   */
  @Cron('30 10 * * *')
  async alertStaffMissedSessions() {
    const activeCohorts = await this.prisma.cohort.findMany({
      where: { state: 'ACTIVE' },
      select: { id: true },
    });

    let alerted = 0;
    for (const cohort of activeCohorts) {
      // Get past sessions for this cohort (already scheduled)
      const pastSessions = await this.prisma.session.findMany({
        where: {
          cohortId: cohort.id,
          scheduledDate: { lt: new Date() },
        },
        orderBy: { scheduledDate: 'desc' },
        take: 10,
        select: { id: true },
      });

      if (pastSessions.length < 3) continue;

      const fellows = await this.prisma.user.findMany({
        where: { cohortId: cohort.id, role: 'FELLOW', isSuspended: false },
        select: { id: true, firstName: true, lastName: true },
      });

      for (const fellow of fellows) {
        // Check the last 3 sessions for attendance
        const last3SessionIds = pastSessions.slice(0, 3).map((s) => s.id);
        const attendanceCount = await this.prisma.attendance.count({
          where: {
            userId: fellow.id,
            sessionId: { in: last3SessionIds },
          },
        });

        if (attendanceCount === 0) {
          try {
            await this.notificationsService.notifyFellowMissedSessions(
              fellow.id,
              `${fellow.firstName} ${fellow.lastName}`,
              cohort.id,
              3,
            );
            alerted++;
          } catch {
            // Non-critical
          }
        }
      }
    }

    if (alerted > 0) {
      this.logger.log(`Alerted staff about ${alerted} fellows with consecutive missed sessions`);
    }
  }

  /**
   * Alert staff about fellows with consistently low resource engagement.
   * Runs daily at 11:00 UTC.
   */
  @Cron('0 11 * * *')
  async alertStaffLowEngagement() {
    // Find fellows whose last 5 completed resources all had engagement quality < 0.3
    const activeCohorts = await this.prisma.cohort.findMany({
      where: { state: 'ACTIVE' },
      select: { id: true },
    });

    let alerted = 0;
    for (const cohort of activeCohorts) {
      const fellows = await this.prisma.user.findMany({
        where: { cohortId: cohort.id, role: 'FELLOW', isSuspended: false },
        select: { id: true, firstName: true, lastName: true },
      });

      for (const fellow of fellows) {
        const recentProgress = await this.prisma.resourceProgress.findMany({
          where: { userId: fellow.id, state: 'COMPLETED' },
          orderBy: { completedAt: 'desc' },
          take: 5,
          select: { engagementQuality: true },
        });

        if (recentProgress.length < 5) continue;

        const allLowQuality = recentProgress.every(
          (p) => (p.engagementQuality ?? 1) < 0.3,
        );

        if (allLowQuality) {
          try {
            const avgQuality = recentProgress.reduce(
              (sum, p) => sum + (p.engagementQuality ?? 0), 0,
            ) / recentProgress.length;

            await this.notificationsService.notifyFellowLowEngagement(
              fellow.id,
              `${fellow.firstName} ${fellow.lastName}`,
              cohort.id,
              `Last 5 resources averaged ${Math.round(avgQuality * 100)}% engagement quality.`,
            );
            alerted++;
          } catch {
            // Non-critical
          }
        }
      }
    }

    if (alerted > 0) {
      this.logger.log(`Alerted staff about ${alerted} fellows with low engagement`);
    }
  }
}
