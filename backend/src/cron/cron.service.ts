import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
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

        if (pointsThisMonth.length > 0) {
          await this.prisma.leaderboardEntry.createMany({
            data: pointsThisMonth.map((p, index) => ({
              leaderboardId: leaderboard.id,
              userId: p.userId,
              rank: index + 1,
              totalPoints: p._sum.points ?? 0,
            })),
          });
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
}
