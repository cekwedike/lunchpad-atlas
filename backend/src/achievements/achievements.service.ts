import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AchievementsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Check and award achievements for a user after specific events.
   * Called after resource completion, quiz completion, discussion post, etc.
   */
  async checkAndAwardAchievements(userId: string): Promise<any[]> {
    const awardedAchievements: any[] = [];

    // Get all achievements the user hasn't unlocked yet
    const unlockedIds = (
      await this.prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true },
      })
    ).map((ua) => ua.achievementId);

    const available = await this.prisma.achievement.findMany({
      where: { id: { notIn: unlockedIds } },
    });

    if (available.length === 0) return [];

    // ── Gather all stats in parallel ──────────────────────────────────────────
    const [
      resourceCount,
      quizCount,
      perfectQuizCount,
      discussionCount,
      commentCount,
      liveQuizCount,
      pointsAgg,
    ] = await Promise.all([
      this.prisma.resourceProgress.count({ where: { userId, state: 'COMPLETED' } }),
      this.prisma.quizResponse.count({ where: { userId, passed: true } }),
      this.prisma.quizResponse.count({ where: { userId, score: 100 } }),
      this.prisma.discussion.count({ where: { userId } }),
      this.prisma.discussionComment.count({ where: { userId } }),
      this.prisma.liveQuizParticipant.count({ where: { userId } }),
      this.prisma.pointsLog.aggregate({ where: { userId }, _sum: { points: true } }),
    ]);

    const totalPoints = pointsAgg._sum.points ?? 0;

    const userStats = {
      resourceCount,
      quizCount,
      perfectQuizCount,
      discussionCount,
      commentCount,
      liveQuizCount,
      totalPoints,
    };

    // ── Check each available achievement ──────────────────────────────────────
    for (const achievement of available) {
      let criteria: Record<string, any> = {};
      try {
        criteria =
          typeof achievement.criteria === 'string'
            ? JSON.parse(achievement.criteria as string)
            : (achievement.criteria as Record<string, any>);
      } catch {
        console.error('Failed to parse criteria for achievement:', achievement.id);
        continue;
      }

      if (!this.checkCriteria(criteria, userStats)) continue;

      // Award the achievement
      await this.prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id, unlockedAt: new Date() },
      });

      // Log the achievement bonus points
      if (achievement.pointValue > 0) {
        await this.prisma.pointsLog.create({
          data: {
            userId,
            points: achievement.pointValue,
            eventType: 'ADMIN_ADJUSTMENT',
            description: `Achievement unlocked: ${achievement.name}`,
          },
        });
      }

      // Send real-time + email notification
      await this.notificationsService.notifyAchievementEarned(
        userId,
        achievement.name,
        achievement.id,
      );

      awardedAchievements.push(achievement);
    }

    return awardedAchievements;
  }

  /**
   * Returns true when ALL criteria keys are satisfied by userStats.
   */
  private checkCriteria(
    criteria: Record<string, any>,
    stats: Record<string, number>,
  ): boolean {
    for (const [key, required] of Object.entries(criteria)) {
      // Legacy boolean shorthand
      if (key === 'quizPerfectScore') {
        if (required === true && (stats.perfectQuizCount ?? 0) < 1) return false;
        continue;
      }

      if (typeof required === 'number') {
        if ((stats[key] ?? 0) < required) return false;
      }
    }
    return true;
  }

  /** Get all achievements a specific user has unlocked */
  async getUserAchievements(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /** Get every achievement definition (for the achievements gallery page) */
  async getAllAchievements() {
    return this.prisma.achievement.findMany({
      orderBy: [{ type: 'asc' }, { pointValue: 'asc' }],
    });
  }
}
