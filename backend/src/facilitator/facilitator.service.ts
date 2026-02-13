import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FacilitatorService {
  constructor(private prisma: PrismaService) {}

  private async verifyAccess(cohortId: string, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true },
    });
    if (!requester) throw new ForbiddenException('Not authenticated');

    if (requester.role === 'ADMIN') return; // Admins can access all cohorts

    const assignment = await this.prisma.cohortFacilitator.findFirst({
      where: { cohortId, userId: requesterId },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this cohort');
    }
  }

  async getCohortStats(cohortId: string, requesterId: string) {
    await this.verifyAccess(cohortId, requesterId);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [fellowCount, activeFellows, resourceIds, totalDiscussions, activeDiscussions] =
      await Promise.all([
        this.prisma.user.count({ where: { cohortId, role: 'FELLOW' } }),
        this.prisma.user.count({
          where: { cohortId, role: 'FELLOW', lastLoginAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.resource.findMany({
          where: { session: { cohortId } },
          select: { id: true },
        }).then((r) => r.map((x) => x.id)),
        this.prisma.discussion.count({ where: { cohortId } }),
        this.prisma.discussion.count({
          where: { cohortId, createdAt: { gte: sevenDaysAgo } },
        }),
      ]);

    const totalResources = resourceIds.length;

    const completedResources = totalResources > 0
      ? await this.prisma.resourceProgress.count({
          where: { resourceId: { in: resourceIds }, state: 'COMPLETED' },
        })
      : 0;

    const avgProgress =
      fellowCount > 0 && totalResources > 0
        ? Math.round((completedResources / (fellowCount * totalResources)) * 100)
        : 0;

    // Attendance rate: count check-in records across all sessions in the cohort
    const attendedFellows = await this.prisma.attendance.count({
      where: { session: { cohortId } },
    });

    const totalSessions = await this.prisma.session.count({ where: { cohortId } });
    const attendanceRate =
      fellowCount > 0 && totalSessions > 0
        ? Math.round((attendedFellows / (fellowCount * totalSessions)) * 100)
        : 0;

    return {
      fellowCount,
      activeFellows,
      avgProgress,
      totalResources,
      completedResources,
      totalDiscussions,
      activeDiscussions,
      avgQuizScore: 0,
      attendanceRate,
    };
  }

  async getFellowEngagement(cohortId: string, requesterId: string) {
    await this.verifyAccess(cohortId, requesterId);

    const fellows = await this.prisma.user.findMany({
      where: { cohortId, role: 'FELLOW' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { lastName: 'asc' },
    });

    const totalResources = await this.prisma.resource.count({
      where: { session: { cohortId } },
    });

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const fellowData = await Promise.all(
      fellows.map(async (fellow) => {
        const [resourcesCompleted, pointsAgg, discussionCount, quizAvgAgg] =
          await Promise.all([
            this.prisma.resourceProgress.count({
              where: { userId: fellow.id, state: 'COMPLETED' },
            }),
            this.prisma.pointsLog.aggregate({
              where: { userId: fellow.id },
              _sum: { points: true },
            }),
            this.prisma.discussion.count({
              where: { userId: fellow.id, cohortId },
            }),
            this.prisma.quizResponse.aggregate({
              where: { userId: fellow.id },
              _avg: { score: true },
            }),
          ]);

        const totalPoints = pointsAgg._sum.points ?? 0;
        const quizAvg = Math.round(quizAvgAgg._avg.score ?? 0);
        const progress =
          totalResources > 0
            ? Math.round((resourcesCompleted / totalResources) * 100)
            : 0;

        const lastActive = fellow.lastLoginAt ?? fellow.createdAt;
        const isInactive = lastActive < fiveDaysAgo;
        const needsAttention = isInactive || progress < 50;
        const attentionReason = isInactive
          ? 'No activity in 5 days'
          : progress < 50
          ? 'Below 50% progress'
          : undefined;

        return {
          userId: fellow.id,
          name: `${fellow.firstName} ${fellow.lastName}`.trim(),
          email: fellow.email,
          progress,
          lastActive,
          resourcesCompleted,
          totalPoints,
          currentStreak: 0,
          discussionCount,
          quizAvg,
          needsAttention,
          attentionReason,
        };
      }),
    );

    return fellowData;
  }

  async getResourceCompletions(cohortId: string, requesterId: string) {
    await this.verifyAccess(cohortId, requesterId);

    const fellowCount = await this.prisma.user.count({
      where: { cohortId, role: 'FELLOW' },
    });

    const resources = await this.prisma.resource.findMany({
      where: { session: { cohortId } },
      select: {
        id: true,
        title: true,
        type: true,
        _count: {
          select: { progress: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    // _count gives total progress records; we need only COMPLETED ones
    const completedCounts = await this.prisma.resourceProgress.groupBy({
      by: ['resourceId'],
      where: {
        resourceId: { in: resources.map((r) => r.id) },
        state: 'COMPLETED',
      },
      _count: { id: true },
    });

    const completedMap = Object.fromEntries(
      completedCounts.map((c) => [c.resourceId, c._count.id]),
    );

    return resources.map((r) => {
      const completed = completedMap[r.id] ?? 0;
      return {
        resourceId: r.id,
        title: r.title,
        type: r.type,
        completionRate:
          fellowCount > 0 ? Math.round((completed / fellowCount) * 100) : 0,
        avgTimeSpent: 0,
        totalAttempts: completed,
      };
    });
  }
}
