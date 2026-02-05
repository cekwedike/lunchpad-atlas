import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AchievementsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check and award achievements for a user after specific events
   * Called after resource completion, quiz completion, etc.
   */
  async checkAndAwardAchievements(userId: string): Promise<any[]> {
    const awardedAchievements: any[] = [];

    // Get all achievements that user hasn't unlocked yet
    const unlockedAchievementIds = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedIds = unlockedAchievementIds.map((ua) => ua.achievementId);

    const availableAchievements = await this.prisma.achievement.findMany({
      where: {
        id: { notIn: unlockedIds },
      },
    });

    // Get user stats for checking criteria
    const [resourceCount, quizCount, perfectQuizzes, discussionCount] = await Promise.all([
      this.prisma.resourceProgress.count({
        where: { userId, state: 'COMPLETED' },
      }),
      this.prisma.quizResponse.count({
        where: { userId, passed: true },
      }),
      this.prisma.quizResponse.count({
        where: { userId, score: 100 },
      }),
      this.prisma.discussion.count({
        where: { userId },
      }),
    ]);

    const userStats = {
      resourceCount,
      quizCount,
      perfectQuizzes,
      discussionCount,
    };

    // Check each achievement's criteria
    for (const achievement of availableAchievements) {
      let criteriaObj: any = {};
      
      try {
        criteriaObj = typeof achievement.criteria === 'string' 
          ? JSON.parse(achievement.criteria as string)
          : achievement.criteria;
      } catch (e) {
        console.error('Failed to parse achievement criteria:', achievement.id);
        continue;
      }

      const isMet = this.checkCriteria(criteriaObj, userStats);

      if (isMet) {
        // Award achievement
        await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            unlockedAt: new Date(),
          },
        });

        // Award points (not using totalPoints field since it doesn't exist)
        // Points are tracked through PointsLog only
        
        // Log achievement points  
        await this.prisma.pointsLog.create({
          data: {
            userId,
            points: achievement.pointValue,
            eventType: 'DISCUSSION_POST', // Using existing event type
            description: `Achievement unlocked: ${achievement.name}`,
          },
        });

        awardedAchievements.push(achievement);
      }
    }

    return awardedAchievements;
  }

  /**
   * Check if achievement criteria are met based on user stats
   */
  private checkCriteria(criteria: any, userStats: any): boolean {
    // Resource count achievements
    if (criteria.resourceCount !== undefined) {
      if (userStats.resourceCount < criteria.resourceCount) return false;
    }

    // Quiz count achievements
    if (criteria.quizCount !== undefined) {
      if (userStats.quizCount < criteria.quizCount) return false;
    }

    // Perfect quiz score achievement
    if (criteria.quizPerfectScore === true) {
      if (userStats.perfectQuizzes < 1) return false;
    }

    // Discussion participation
    if (criteria.discussionCount !== undefined) {
      if (userStats.discussionCount < criteria.discussionCount) return false;
    }

    // Add more criteria checks as needed
    // e.g., streaks, time-based, session-specific, etc.

    return true; // All criteria met
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(userId: string) {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });

    return userAchievements;
  }

  /**
   * Get all available achievements
   */
  async getAllAchievements() {
    return this.prisma.achievement.findMany({
      orderBy: { pointValue: 'desc' },
    });
  }
}
