import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { AchievementType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getCohortDurationMonths,
  getTotalTargetForDuration,
  getScaledLeaderboardThreshold,
} from '../common/gamification.utils';

const ACHIEVEMENT_DEFINITIONS = [
  // MILESTONE (18)
  { name: 'First Step',        description: 'Complete your first resource',                                                              type: AchievementType.MILESTONE,   iconUrl: '🎯', pointValue: 10,   criteria: { resourceCount: 1 } },
  { name: 'Getting Started',   description: 'Complete 8 resources',                                                                     type: AchievementType.MILESTONE,   iconUrl: '📚', pointValue: 25,   criteria: { resourceCount: 8 } },
  { name: 'Resource Explorer', description: 'Complete 15 resources',                                                                    type: AchievementType.MILESTONE,   iconUrl: '🔭', pointValue: 50,   criteria: { resourceCount: 15 } },
  { name: 'Halfway There',     description: 'Complete 30 resources',                                                                    type: AchievementType.MILESTONE,   iconUrl: '🏃', pointValue: 100,  criteria: { resourceCount: 30 } },
  { name: 'Resource Master',   description: 'Complete 50 resources',                                                                    type: AchievementType.MILESTONE,   iconUrl: '🎓', pointValue: 250,  criteria: { resourceCount: 50 } },
  { name: 'Quiz Rookie',       description: 'Pass your first quiz',                                                                     type: AchievementType.MILESTONE,   iconUrl: '📝', pointValue: 10,   criteria: { quizCount: 1 } },
  { name: 'Quiz Enthusiast',   description: 'Pass 7 quizzes',                                                                          type: AchievementType.MILESTONE,   iconUrl: '✏️', pointValue: 50,   criteria: { quizCount: 7 } },
  { name: 'Quiz Expert',       description: 'Pass 12 quizzes',                                                                         type: AchievementType.MILESTONE,   iconUrl: '🧠', pointValue: 100,  criteria: { quizCount: 12 } },
  { name: 'Quiz Champion',     description: 'Pass 20 quizzes',                                                                         type: AchievementType.MILESTONE,   iconUrl: '🏅', pointValue: 200,  criteria: { quizCount: 20 } },
  { name: 'Perfectionist',     description: 'Score 100% on a quiz',                                                                    type: AchievementType.MILESTONE,   iconUrl: '💯', pointValue: 50,   criteria: { perfectQuizCount: 1 } },
  { name: 'Twice Perfect',     description: 'Score 100% on 3 quizzes',                                                                 type: AchievementType.MILESTONE,   iconUrl: '✨', pointValue: 100,  criteria: { perfectQuizCount: 3 } },
  { name: 'Flawless Five',     description: 'Score 100% on 5 quizzes',                                                                 type: AchievementType.MILESTONE,   iconUrl: '🌟', pointValue: 200,  criteria: { perfectQuizCount: 5 } },
  { name: 'Flawless Ten',      description: 'Score 100% on 10 quizzes',                                                                type: AchievementType.MILESTONE,   iconUrl: '⭐', pointValue: 400,  criteria: { perfectQuizCount: 10 } },
  { name: 'Live Buzzer',       description: 'Participate in your first live quiz',                                                      type: AchievementType.MILESTONE,   iconUrl: '🎮', pointValue: 25,   criteria: { liveQuizCount: 1 } },
  { name: 'Live Regular',      description: 'Participate in 5 live quizzes',                                                           type: AchievementType.MILESTONE,   iconUrl: '🕹️', pointValue: 75,   criteria: { liveQuizCount: 5 } },
  { name: 'Live Pro',          description: 'Participate in 10 live quizzes',                                                          type: AchievementType.MILESTONE,   iconUrl: '🎯', pointValue: 150,  criteria: { liveQuizCount: 10 } },
  { name: 'Live Veteran',      description: 'Participate in 25 live quizzes',                                                          type: AchievementType.MILESTONE,   iconUrl: '🏆', pointValue: 300,  criteria: { liveQuizCount: 25 } },
  { name: 'Overachiever',      description: 'Complete 30 resources, pass 12 quizzes, and score 100% three times',                      type: AchievementType.MILESTONE,   iconUrl: '🚀', pointValue: 350,  criteria: { resourceCount: 30, quizCount: 12, perfectQuizCount: 3 } },
  // SOCIAL (12)
  { name: 'First Post',        description: 'Post your first discussion',                                                              type: AchievementType.SOCIAL,      iconUrl: '💬', pointValue: 10,   criteria: { discussionCount: 1 } },
  { name: 'Regular Poster',    description: 'Post 5 discussions',                                                                      type: AchievementType.SOCIAL,      iconUrl: '📣', pointValue: 20,   criteria: { discussionCount: 5 } },
  { name: 'Conversationalist', description: 'Post 10 discussions',                                                                     type: AchievementType.SOCIAL,      iconUrl: '🗣️', pointValue: 35,   criteria: { discussionCount: 10 } },
  { name: 'Community Voice',   description: 'Post 15 discussions',                                                                     type: AchievementType.SOCIAL,      iconUrl: '📢', pointValue: 75,   criteria: { discussionCount: 15 } },
  { name: 'Forum Regular',     description: 'Post 25 discussions',                                                                     type: AchievementType.SOCIAL,      iconUrl: '🏛️', pointValue: 150,  criteria: { discussionCount: 25 } },
  { name: 'Community Pillar',  description: 'Post 50 discussions',                                                                     type: AchievementType.SOCIAL,      iconUrl: '🌐', pointValue: 300,  criteria: { discussionCount: 50 } },
  { name: 'First Reply',       description: 'Post your first comment',                                                                 type: AchievementType.SOCIAL,      iconUrl: '↩️', pointValue: 5,    criteria: { commentCount: 1 } },
  { name: 'Active Responder',  description: 'Post 15 comments',                                                                       type: AchievementType.SOCIAL,      iconUrl: '💭', pointValue: 25,   criteria: { commentCount: 15 } },
  { name: 'Reply Guru',        description: 'Post 30 comments',                                                                       type: AchievementType.SOCIAL,      iconUrl: '🎙️', pointValue: 75,   criteria: { commentCount: 30 } },
  { name: 'Reply Legend',      description: 'Post 50 comments',                                                                       type: AchievementType.SOCIAL,      iconUrl: '📡', pointValue: 150,  criteria: { commentCount: 50 } },
  { name: 'Mega Contributor',  description: 'Post 100 comments',                                                                      type: AchievementType.SOCIAL,      iconUrl: '🔊', pointValue: 300,  criteria: { commentCount: 100 } },
  { name: 'Social Butterfly',  description: 'Post 15 discussions and 15 comments',                                                    type: AchievementType.SOCIAL,      iconUrl: '🦋', pointValue: 100,  criteria: { discussionCount: 15, commentCount: 15 } },
  // STREAK / COMBO (10)
  { name: 'Combo Starter',     description: 'Complete 8 resources and pass 3 quizzes',                                                type: AchievementType.STREAK,      iconUrl: '⚡', pointValue: 35,   criteria: { resourceCount: 8, quizCount: 3 } },
  { name: 'Momentum Builder',  description: 'Complete 15 resources and pass 7 quizzes',                                               type: AchievementType.STREAK,      iconUrl: '🔥', pointValue: 75,   criteria: { resourceCount: 15, quizCount: 7 } },
  { name: 'All-Rounder',       description: 'Complete 15 resources, pass 7 quizzes, and post 7 discussions',                          type: AchievementType.STREAK,      iconUrl: '🎪', pointValue: 150,  criteria: { resourceCount: 15, quizCount: 7, discussionCount: 7 } },
  { name: 'Triple Threat',     description: 'Complete 30 resources, pass 12 quizzes, and post 12 discussions',                        type: AchievementType.STREAK,      iconUrl: '🎯', pointValue: 300,  criteria: { resourceCount: 30, quizCount: 12, discussionCount: 12 } },
  { name: 'Scholar',           description: 'Complete 25 resources, score 100% on 5 quizzes, and post 7 discussions',                 type: AchievementType.STREAK,      iconUrl: '📖', pointValue: 250,  criteria: { resourceCount: 25, perfectQuizCount: 5, discussionCount: 7 } },
  { name: 'Live Learner',      description: 'Complete 10 resources and join 5 live quizzes',                                          type: AchievementType.STREAK,      iconUrl: '🎓', pointValue: 50,   criteria: { resourceCount: 10, liveQuizCount: 5 } },
  { name: 'Engaged Scholar',   description: 'Complete 20 resources, post 7 discussions, and 8 comments',                              type: AchievementType.STREAK,      iconUrl: '🌱', pointValue: 200,  criteria: { resourceCount: 20, discussionCount: 7, commentCount: 8 } },
  { name: 'The Trifecta',      description: 'Complete 50 resources, pass 20 quizzes, and post 25 discussions',                        type: AchievementType.STREAK,      iconUrl: '🎆', pointValue: 600,  criteria: { resourceCount: 50, quizCount: 20, discussionCount: 25 } },
  { name: 'Perfect Scholar',   description: 'Score 100% on 7 quizzes and post 12 discussions',                                        type: AchievementType.STREAK,      iconUrl: '💎', pointValue: 300,  criteria: { perfectQuizCount: 7, discussionCount: 12 } },
  { name: 'Campus Legend',     description: 'Complete 50 resources, pass 15 quizzes, post 20 discussions, join 10 live quizzes',      type: AchievementType.STREAK,      iconUrl: '👑', pointValue: 750,  criteria: { resourceCount: 50, quizCount: 15, discussionCount: 20, liveQuizCount: 10 } },
  // LEADERBOARD / POINTS (10) — thresholds are the 4-month (80 k) fallback values;
  // at runtime they are scaled via getScaledLeaderboardThreshold() based on cohort length.
  { name: 'Point Starter',     description: 'Earn 400 points',                                                                        type: AchievementType.LEADERBOARD, iconUrl: '🥉', pointValue: 15,   criteria: { totalPoints: 400 } },
  { name: 'Point Collector',   description: 'Earn 2,500 points',                                                                      type: AchievementType.LEADERBOARD, iconUrl: '🥈', pointValue: 25,   criteria: { totalPoints: 2500 } },
  { name: 'Point Accumulator', description: 'Earn 6,000 points',                                                                      type: AchievementType.LEADERBOARD, iconUrl: '🥇', pointValue: 50,   criteria: { totalPoints: 6000 } },
  { name: 'Point Hoarder',     description: 'Earn 12,000 points',                                                                     type: AchievementType.LEADERBOARD, iconUrl: '💰', pointValue: 75,   criteria: { totalPoints: 12000 } },
  { name: 'Point Enthusiast',  description: 'Earn 20,000 points',                                                                     type: AchievementType.LEADERBOARD, iconUrl: '💎', pointValue: 100,  criteria: { totalPoints: 20000 } },
  { name: 'Point Expert',      description: 'Earn 32,000 points',                                                                     type: AchievementType.LEADERBOARD, iconUrl: '🏅', pointValue: 150,  criteria: { totalPoints: 32000 } },
  { name: 'Point Legend',      description: 'Earn 44,000 points',                                                                     type: AchievementType.LEADERBOARD, iconUrl: '🌟', pointValue: 200,  criteria: { totalPoints: 44000 } },
  { name: 'Point Elite',       description: 'Earn 58,000 points',                                                                     type: AchievementType.LEADERBOARD, iconUrl: '⭐', pointValue: 300,  criteria: { totalPoints: 58000 } },
  { name: 'Living Legend',     description: 'Earn 68,000 points',                                                                     type: AchievementType.LEADERBOARD, iconUrl: '🔱', pointValue: 500,  criteria: { totalPoints: 68000 } },
  { name: 'The GOAT',          description: 'Earn 76,000 points — the greatest of all time',                                          type: AchievementType.LEADERBOARD, iconUrl: '🐐', pointValue: 1000, criteria: { totalPoints: 76000 } },
  // SPEC-REQUIRED: Monthly/Ranking/Special achievements (6)
  { name: 'Monthly Champion',  description: 'Finish #1 on the monthly leaderboard',                                                   type: AchievementType.LEADERBOARD, iconUrl: '🏆', pointValue: 100,  criteria: { monthlyRank: 1 } },
  { name: 'Top 10 Finisher',   description: 'Finish in the top 10 on the monthly leaderboard',                                        type: AchievementType.LEADERBOARD, iconUrl: '🎖️', pointValue: 50,   criteria: { monthlyRank: 10 } },
  { name: 'Consistency Star',  description: 'Complete 100% of core resources in a month',                                             type: AchievementType.MILESTONE,   iconUrl: '⭐', pointValue: 100,  criteria: { monthlyCoreCompletion: 100 } },
  { name: 'Deep Diver',        description: 'Complete all optional resources in a session',                                           type: AchievementType.MILESTONE,   iconUrl: '🤿', pointValue: 100,  criteria: { sessionOptionalCompletion: 100 } },
  { name: 'Thought Leader',    description: 'Post 7 high-quality discussions (AI-scored)',                                            type: AchievementType.SOCIAL,      iconUrl: '💡', pointValue: 80,   criteria: { qualityDiscussionCount: 7 } },
  { name: 'Quiz Master',       description: 'Finish in the top 3 of a live quiz session',                                             type: AchievementType.MILESTONE,   iconUrl: '🧙', pointValue: 60,   criteria: { liveQuizTop3: 1 } },
];

@Injectable()
export class AchievementsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
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
