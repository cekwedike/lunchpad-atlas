import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FacilitatorService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

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

    const fellowIds = fellows.map((f) => f.id);

    const totalResources = await this.prisma.resource.count({
      where: { session: { cohortId } },
    });

    // Monthly resource IDs — resources from sessions scheduled this calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyResourceIds = await this.prisma.resource
      .findMany({
        where: { session: { cohortId, scheduledDate: { gte: monthStart, lte: monthEnd } } },
        select: { id: true },
      })
      .then((r) => r.map((x) => x.id));

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // Batch queries to avoid N+1 — one query per metric for all fellows at once
    const [completionCounts, monthlyCompletionCounts, pointsSums, discussionCounts, quizAvgs] =
      await Promise.all([
        this.prisma.resourceProgress.groupBy({
          by: ['userId'],
          where: { userId: { in: fellowIds }, state: 'COMPLETED' },
          _count: { id: true },
        }),
        monthlyResourceIds.length > 0
          ? this.prisma.resourceProgress.groupBy({
              by: ['userId'],
              where: {
                userId: { in: fellowIds },
                resourceId: { in: monthlyResourceIds },
                state: 'COMPLETED',
              },
              _count: { id: true },
            })
          : Promise.resolve([] as Array<{ userId: string; _count: { id: number } }>),
        this.prisma.pointsLog.groupBy({
          by: ['userId'],
          where: { userId: { in: fellowIds } },
          _sum: { points: true },
        }),
        this.prisma.discussion.groupBy({
          by: ['userId'],
          where: { userId: { in: fellowIds }, cohortId },
          _count: { id: true },
        }),
        this.prisma.quizResponse.groupBy({
          by: ['userId'],
          where: { userId: { in: fellowIds } },
          _avg: { score: true },
        }),
      ]);

    const completionMap = new Map(completionCounts.map((c) => [c.userId, c._count.id]));
    const monthlyCompletionMap = new Map(monthlyCompletionCounts.map((c) => [c.userId, c._count.id]));
    const pointsMap = new Map(pointsSums.map((p) => [p.userId, p._sum.points ?? 0]));
    const discussionMap = new Map(discussionCounts.map((d) => [d.userId, d._count.id]));
    const quizMap = new Map(quizAvgs.map((q) => [q.userId, Math.round(q._avg.score ?? 0)]));

    return fellows.map((fellow) => {
      const resourcesCompleted = completionMap.get(fellow.id) ?? 0;
      const totalPoints = pointsMap.get(fellow.id) ?? 0;
      const discussionCount = discussionMap.get(fellow.id) ?? 0;
      const quizAvg = quizMap.get(fellow.id) ?? 0;

      const progress =
        totalResources > 0
          ? Math.round((resourcesCompleted / totalResources) * 100)
          : 0;

      const monthlyCompleted = monthlyCompletionMap.get(fellow.id) ?? 0;
      const monthlyProgress =
        monthlyResourceIds.length > 0
          ? Math.round((monthlyCompleted / monthlyResourceIds.length) * 100)
          : null; // null = no sessions scheduled this month yet

      const lastActive = fellow.lastLoginAt ?? fellow.createdAt;
      const isInactive = lastActive < fiveDaysAgo;
      const isBehindSchedule = monthlyProgress !== null && monthlyProgress < 50;
      const needsAttention = isInactive || isBehindSchedule;
      const attentionReason = isInactive
        ? 'No activity in 5 days'
        : isBehindSchedule
        ? `Behind on this month's resources (${monthlyProgress}% done)`
        : undefined;

      return {
        userId: fellow.id,
        name: `${fellow.firstName} ${fellow.lastName}`.trim(),
        email: fellow.email,
        progress,
        monthlyProgress,
        lastActive,
        resourcesCompleted,
        totalPoints,
        currentStreak: 0,
        discussionCount,
        quizAvg,
        needsAttention,
        attentionReason,
      };
    });
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

  async suspendFellow(cohortId: string, fellowId: string, requesterId: string, reason?: string) {
    await this.verifyAccess(cohortId, requesterId);

    const fellow = await this.prisma.user.findUnique({
      where: { id: fellowId },
      select: { id: true, cohortId: true, role: true, firstName: true, lastName: true },
    });

    if (!fellow) throw new NotFoundException('User not found');
    if (fellow.role !== 'FELLOW') throw new ForbiddenException('Can only suspend fellows');
    if (fellow.cohortId !== cohortId) throw new ForbiddenException('Fellow is not in your cohort');

    await this.prisma.user.update({
      where: { id: fellowId },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspensionReason: reason,
      },
    });

    // Notify the suspended fellow
    await this.notificationsService.createNotification({
      userId: fellowId,
      type: NotificationType.USER_SUSPENDED,
      title: 'Your account has been suspended',
      message: reason
        ? `Your account has been suspended. Reason: ${reason}`
        : 'Your account has been suspended. Please contact your facilitator for more information.',
      data: {},
    });

    return { message: 'Fellow suspended', fellowId };
  }

  async unsuspendFellow(cohortId: string, fellowId: string, requesterId: string) {
    await this.verifyAccess(cohortId, requesterId);

    const fellow = await this.prisma.user.findUnique({
      where: { id: fellowId },
      select: { id: true, cohortId: true, role: true },
    });

    if (!fellow) throw new NotFoundException('User not found');
    if (fellow.role !== 'FELLOW') throw new ForbiddenException('Can only unsuspend fellows');
    if (fellow.cohortId !== cohortId) throw new ForbiddenException('Fellow is not in your cohort');

    await this.prisma.user.update({
      where: { id: fellowId },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspensionReason: null,
      },
    });

    await this.notificationsService.createNotification({
      userId: fellowId,
      type: NotificationType.USER_UNSUSPENDED,
      title: 'Your account has been restored',
      message: 'Your account suspension has been lifted. You can now log in.',
      data: {},
    });

    return { message: 'Fellow unsuspended', fellowId };
  }
}
