import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { AchievementType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getCohortDurationMonths,
  getTotalTargetForDuration,
  getScaledLeaderboardThreshold,
} from '../common/gamification.utils';
import { PointsService } from '../gamification/points.service';
import { ACHIEVEMENT_DEFINITIONS } from './achievement-definitions';

@Injectable()
export class AchievementsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private pointsService: PointsService,
  ) {}

  async onApplicationBootstrap() {
    // Load existing achievements by name so we can diff create vs. update.
    const existing = await this.prisma.achievement.findMany({
      select: { id: true, name: true },
    });
    const existingMap = new Map(existing.map((a) => [a.name, a.id]));

    const toCreate = ACHIEVEMENT_DEFINITIONS.filter((a) => !existingMap.has(a.name));
    const toUpdate = ACHIEVEMENT_DEFINITIONS.filter((a) => existingMap.has(a.name));

    if (toCreate.length > 0) {
      await this.prisma.achievement.createMany({
        data: toCreate.map((a) => ({ ...a, criteria: JSON.stringify(a.criteria) })),
        skipDuplicates: true,
      });
      this.logger.log(`Created ${toCreate.length} new achievement definition(s)`);
    }

    // Sync criteria, descriptions, and point values for existing achievements so
    // that code changes automatically propagate to the DB on next boot.
    if (toUpdate.length > 0) {
      await Promise.all(
        toUpdate.map((def) =>
          this.prisma.achievement.update({
            where: { id: existingMap.get(def.name)! },
            data: {
              description: def.description,
              type: def.type,
              iconUrl: def.iconUrl,
              pointValue: def.pointValue,
              criteria: JSON.stringify(def.criteria),
            },
          }),
        ),
      );
      this.logger.log(`Synced ${toUpdate.length} existing achievement definition(s)`);
    }
  }

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

    // ── Resolve cohort scope for this user ────────────────────────────────────
    // LEADERBOARD achievements use cohort-scoped points (earned since cohort
    // startDate) and dynamically scaled thresholds based on cohort duration.
    const userRecord = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true },
    });

    let cohortStartDate: Date | null = null;
    let cohortTotalTarget: number | null = null;

    if (userRecord?.cohortId) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: userRecord.cohortId },
        select: { startDate: true, endDate: true },
      });
      if (cohort) {
        cohortStartDate = cohort.startDate;
        const months = getCohortDurationMonths(cohort.startDate, cohort.endDate);
        cohortTotalTarget = getTotalTargetForDuration(months);
      }
    }

    // ── Gather all stats in parallel ──────────────────────────────────────────
    const cohortId = userRecord?.cohortId ?? null;

    // Date window for Consistency Star: current calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      resourceCount,
      quizCount,
      perfectQuizCount,
      discussionCount,
      commentCount,
      liveQuizCount,
      qualityDiscussionCount,
      liveQuizTop3,
      pointsAgg,
      // Consistency Star: core resources in sessions scheduled this calendar month
      coreResourcesThisMonth,
      // Deep Diver: optional resources grouped by session across the cohort
      sessionsWithOptional,
    ] = await Promise.all([
      this.prisma.resourceProgress.count({ where: { userId, state: 'COMPLETED' } }),
      this.prisma.quizResponse.count({ where: { userId, passed: true } }),
      this.prisma.quizResponse.count({ where: { userId, score: 100 } }),
      this.prisma.discussion.count({ where: { userId } }),
      this.prisma.discussionComment.count({ where: { userId } }),
      this.prisma.liveQuizParticipant.count({ where: { userId } }),
      // AI-scored discussions with qualityScore >= 70 (for Thought Leader)
      this.prisma.discussion.count({ where: { userId, qualityScore: { gte: 70 } } }),
      // Live quiz sessions where the user finished in the top 3 (for Quiz Master)
      this.prisma.liveQuizParticipant.count({ where: { userId, rank: { lte: 3 } } }),
      // Points are scoped to the current cohort (since cohort startDate) so
      // that LEADERBOARD achievements reset when a fellow joins a new cohort.
      this.prisma.pointsLog.aggregate({
        where: {
          userId,
          ...(cohortStartDate ? { createdAt: { gte: cohortStartDate } } : {}),
        },
        _sum: { points: true },
      }),
      cohortId
        ? this.prisma.resource.findMany({
            where: {
              session: {
                cohortId,
                scheduledDate: { gte: monthStart, lte: monthEnd },
              },
              isCore: true,
            },
            select: { id: true },
          })
        : Promise.resolve([] as Array<{ id: string }>),
      cohortId
        ? this.prisma.session.findMany({
            where: { cohortId },
            select: {
              id: true,
              resources: { where: { isCore: false }, select: { id: true } },
            },
          })
        : Promise.resolve([] as Array<{ id: string; resources: Array<{ id: string }> }>),
    ]);

    const totalPoints = pointsAgg._sum.points ?? 0;

    // ── Second round: completion checks (depends on IDs from first round) ─────
    const coreResourceIds = coreResourcesThisMonth.map((r) => r.id);
    const sessionsWithAnyOptional = sessionsWithOptional.filter((s) => s.resources.length > 0);
    const allOptionalIds = sessionsWithAnyOptional.flatMap((s) => s.resources.map((r) => r.id));

    const [completedCoreCount, completedOptionalProgress] = await Promise.all([
      coreResourceIds.length > 0
        ? this.prisma.resourceProgress.count({
            where: { userId, state: 'COMPLETED', resourceId: { in: coreResourceIds } },
          })
        : Promise.resolve(0),
      allOptionalIds.length > 0
        ? this.prisma.resourceProgress.findMany({
            where: { userId, state: 'COMPLETED', resourceId: { in: allOptionalIds } },
            select: { resourceId: true },
          })
        : Promise.resolve([] as Array<{ resourceId: string }>),
    ]);

    // Consistency Star: 100 only when ALL core resources this month are done
    const monthlyCoreCompletion =
      coreResourceIds.length > 0 && completedCoreCount >= coreResourceIds.length ? 100 : 0;

    // Deep Diver: 100 when the user has completed every optional resource in at least one session
    let sessionOptionalCompletion = 0;
    if (allOptionalIds.length > 0) {
      const completedSet = new Set(completedOptionalProgress.map((p) => p.resourceId));
      for (const session of sessionsWithAnyOptional) {
        if (session.resources.every((r) => completedSet.has(r.id))) {
          sessionOptionalCompletion = 100;
          break;
        }
      }
    }

    const userStats = {
      resourceCount,
      quizCount,
      perfectQuizCount,
      discussionCount,
      commentCount,
      liveQuizCount,
      qualityDiscussionCount,
      liveQuizTop3,
      totalPoints,
      monthlyCoreCompletion,
      sessionOptionalCompletion,
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

      // For LEADERBOARD achievements with a totalPoints threshold, scale the
      // threshold proportionally to the cohort's total-point target so that
      // milestones feel equally challenging regardless of cohort length.
      let effectiveCriteria = criteria;
      if (
        achievement.type === AchievementType.LEADERBOARD &&
        cohortTotalTarget !== null &&
        'totalPoints' in criteria
      ) {
        effectiveCriteria = {
          ...criteria,
          totalPoints: getScaledLeaderboardThreshold(
            achievement.name,
            cohortTotalTarget,
            criteria.totalPoints as number,
          ),
        };
      }

      if (!this.checkCriteria(effectiveCriteria, userStats)) continue;

      // Award the achievement
      await this.prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id, unlockedAt: new Date() },
      });

      // Log the achievement bonus points (bypass monthly cap — milestones are intentional rewards)
      if (achievement.pointValue > 0) {
        const award = await this.pointsService.awardPoints({
          userId,
          points: achievement.pointValue,
          eventType: 'ADMIN_ADJUSTMENT' as any,
          description: `Achievement unlocked: ${achievement.name}`,
          metadata: { achievementId: achievement.id, achievementName: achievement.name } as any,
          bypassMonthlyCap: true,
        });
        if (!award.awarded) {
          this.logger.warn(
            `Achievement "${achievement.name}" recorded for ${userId} but bonus points were not awarded: ${award.reason ?? 'unknown'}`,
          );
        }
      }

      // ── Notify the fellow ─────────────────────────────────────────────────
      await this.notificationsService.notifyAchievementEarned(
        userId,
        achievement.name,
        achievement.id,
      );

      // ── Notify facilitators of the fellow's cohort + all admins ───────────
      const fellow = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, cohortId: true },
      });

      if (fellow) {
        // Staff alerts only for higher-value achievements to avoid spam (fellow still gets notifyAchievementEarned above).
        const STAFF_ACHIEVEMENT_MIN_POINTS = 50;
        if (achievement.pointValue >= STAFF_ACHIEVEMENT_MIN_POINTS) {
          const staffWhereClause = fellow.cohortId
            ? {
                OR: [
                  { role: 'ADMIN' as const },
                  { role: 'FACILITATOR' as const, cohortId: fellow.cohortId },
                ],
              }
            : { role: 'ADMIN' as const };

          const staff = await this.prisma.user.findMany({
            where: staffWhereClause,
            select: { id: true },
          });

          const fellowName = [fellow.firstName, fellow.lastName].filter(Boolean).join(' ') || 'A fellow';
          await Promise.all(
            staff.map((s) =>
              this.notificationsService.createNotification({
                userId: s.id,
                type: 'ACHIEVEMENT_EARNED',
                title: 'Achievement Unlocked by Fellow',
                message: `${fellowName} just earned the "${achievement.name}" achievement!`,
                data: {
                  achievementId: achievement.id,
                  achievementName: achievement.name,
                  fellowId: userId,
                  fellowName,
                },
              }),
            ),
          );
        }
      }

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
