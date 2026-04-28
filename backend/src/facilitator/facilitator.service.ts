import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CohortLeadershipRole,
  NotificationType,
  UserRole,
} from '@prisma/client';
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

  /**
   * Read-only cohort insights: admins, assigned facilitators, or cohort captain /
   * assistant captain (fellows in the same cohort).
   */
  private async verifyCohortInsightAccess(
    cohortId: string,
    requesterId: string,
  ): Promise<'admin' | 'facilitator' | 'captain'> {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: {
        role: true,
        cohortId: true,
        cohortLeadershipRole: true,
      },
    });
    if (!requester) throw new ForbiddenException('Not authenticated');
    if (requester.role === UserRole.ADMIN) return 'admin';

    const assignment = await this.prisma.cohortFacilitator.findFirst({
      where: { cohortId, userId: requesterId },
    });
    if (assignment) return 'facilitator';

    if (
      requester.role === UserRole.FELLOW &&
      requester.cohortId === cohortId &&
      requester.cohortLeadershipRole !== CohortLeadershipRole.NONE
    ) {
      return 'captain';
    }

    throw new ForbiddenException('You are not assigned to this cohort');
  }

  async getCohortStats(cohortId: string, requesterId: string) {
    await this.verifyCohortInsightAccess(cohortId, requesterId);

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
    await this.verifyCohortInsightAccess(cohortId, requesterId);

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

    // Resources due before the next upcoming session (not calendar month — avoids penalizing
    // fellows for content in future sessions that have not unlocked yet).
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: { cohortId },
      orderBy: { sessionNumber: 'asc' },
      select: { id: true, sessionNumber: true, scheduledDate: true, title: true },
    });
    const nextSession =
      sessions.find((s) => new Date(s.scheduledDate) >= now) ?? null;

    let dueBeforeNextSessionResourceIds: string[] = [];
    if (nextSession) {
      dueBeforeNextSessionResourceIds = await this.prisma.resource
        .findMany({
          where: {
            session: { cohortId, sessionNumber: { lt: nextSession.sessionNumber } },
          },
          select: { id: true },
        })
        .then((r) => r.map((x) => x.id));
    } else {
      // All cohort sessions are in the past — full catalog is the due set.
      dueBeforeNextSessionResourceIds = await this.prisma.resource
        .findMany({
          where: { session: { cohortId } },
          select: { id: true },
        })
        .then((r) => r.map((x) => x.id));
    }

    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    // Batch queries to avoid N+1 — one query per metric for all fellows at once
    const [completionCounts, sessionDueCompletionCounts, pointsSums, discussionCounts, quizAvgs] =
      await Promise.all([
        this.prisma.resourceProgress.groupBy({
          by: ['userId'],
          where: { userId: { in: fellowIds }, state: 'COMPLETED' },
          _count: { id: true },
        }),
        dueBeforeNextSessionResourceIds.length > 0
          ? this.prisma.resourceProgress.groupBy({
              by: ['userId'],
              where: {
                userId: { in: fellowIds },
                resourceId: { in: dueBeforeNextSessionResourceIds },
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
    const sessionDueCompletionMap = new Map(
      sessionDueCompletionCounts.map((c) => [c.userId, c._count.id]),
    );
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

      const sessionDueCompleted = sessionDueCompletionMap.get(fellow.id) ?? 0;
      const sessionProgress =
        dueBeforeNextSessionResourceIds.length > 0
          ? Math.round(
              (sessionDueCompleted / dueBeforeNextSessionResourceIds.length) * 100,
            )
          : null;

      const lastActive = fellow.lastLoginAt ?? fellow.createdAt;
      const isInactive = lastActive < fiveDaysAgo;
      const isBehindSchedule = sessionProgress !== null && sessionProgress < 50;
      const needsAttention = isInactive || isBehindSchedule;
      const nextSessionLabel = nextSession
        ? `session ${nextSession.sessionNumber}${
            nextSession.title ? ` (${nextSession.title})` : ''
          }`
        : 'the program';
      const attentionReason = isInactive
        ? 'No activity in 5 days'
        : isBehindSchedule
        ? `Behind on resources due before ${nextSessionLabel} (${sessionProgress}% done)`
        : undefined;

      return {
        userId: fellow.id,
        name: `${fellow.firstName} ${fellow.lastName}`.trim(),
        email: fellow.email,
        progress,
        sessionProgress,
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
    await this.verifyCohortInsightAccess(cohortId, requesterId);

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

  /**
   * Per-fellow × resource progress for cohort captains / facilitators / admins.
   * Used by Cohort Pulse to see who completed each resource and who may need a nudge.
   */
  async getFellowResourceMatrix(cohortId: string, requesterId: string) {
    await this.verifyCohortInsightAccess(cohortId, requesterId);

    const fellowsRaw = await this.prisma.user.findMany({
      where: { cohortId, role: 'FELLOW' },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const fellows = fellowsRaw.map((f) => ({
      userId: f.id,
      name: `${f.firstName} ${f.lastName}`.trim(),
      email: f.email,
    }));

    const resources = await this.prisma.resource.findMany({
      where: { session: { cohortId } },
      select: {
        id: true,
        title: true,
        type: true,
        isCore: true,
        order: true,
        session: { select: { sessionNumber: true, title: true } },
      },
      orderBy: [
        { session: { sessionNumber: 'asc' } },
        { order: 'asc' },
      ],
    });

    const resourceIds = resources.map((r) => r.id);
    const fellowIds = fellows.map((f) => f.userId);

    const progressRows =
      resourceIds.length > 0 && fellowIds.length > 0
        ? await this.prisma.resourceProgress.findMany({
            where: {
              resourceId: { in: resourceIds },
              userId: { in: fellowIds },
            },
            select: { userId: true, resourceId: true, state: true },
          })
        : [];

    const progressByUser = new Map<string, Map<string, string>>();
    for (const row of progressRows) {
      if (!progressByUser.has(row.userId)) {
        progressByUser.set(row.userId, new Map());
      }
      progressByUser.get(row.userId)!.set(row.resourceId, row.state);
    }

    const cells: Array<{
      userId: string;
      resourceId: string;
      state: string | null;
      needsAttention: boolean;
    }> = [];

    for (const uid of fellowIds) {
      const rowMap = progressByUser.get(uid);
      for (const rid of resourceIds) {
        const state = rowMap?.get(rid) ?? null;
        const needsAttention =
          state !== null &&
          state !== 'COMPLETED' &&
          state !== 'LOCKED';
        cells.push({ userId: uid, resourceId: rid, state, needsAttention });
      }
    }

    return {
      resources: resources.map((r) => ({
        resourceId: r.id,
        title: r.title,
        type: r.type,
        isCore: r.isCore,
        sessionNumber: r.session.sessionNumber,
        sessionTitle: r.session.title,
      })),
      fellows,
      cells,
    };
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

  async setCohortLeadership(
    cohortId: string,
    requesterId: string,
    dto: { captainUserId?: string | null; assistantUserId?: string | null },
  ) {
    await this.verifyAccess(cohortId, requesterId);

    const { captainUserId, assistantUserId } = dto;

    const assertFellowInCohort = async (userId: string) => {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, cohortId: true, role: true },
      });
      if (!u) throw new NotFoundException('User not found');
      if (u.role !== UserRole.FELLOW) {
        throw new BadRequestException('Only fellows can hold cohort leadership roles');
      }
      if (u.cohortId !== cohortId) {
        throw new BadRequestException('User is not in this cohort');
      }
    };

    if (
      captainUserId != null &&
      assistantUserId != null &&
      captainUserId === assistantUserId
    ) {
      throw new BadRequestException('Captain and assistant must be different users');
    }

    if (captainUserId !== undefined) {
      if (captainUserId === null) {
        await this.prisma.user.updateMany({
          where: {
            cohortId,
            role: UserRole.FELLOW,
            cohortLeadershipRole: CohortLeadershipRole.COHORT_CAPTAIN,
          },
          data: { cohortLeadershipRole: CohortLeadershipRole.NONE },
        });
      } else {
        await assertFellowInCohort(captainUserId);
        await this.prisma.user.updateMany({
          where: {
            cohortId,
            role: UserRole.FELLOW,
            cohortLeadershipRole: CohortLeadershipRole.COHORT_CAPTAIN,
          },
          data: { cohortLeadershipRole: CohortLeadershipRole.NONE },
        });
        await this.prisma.user.update({
          where: { id: captainUserId },
          data: { cohortLeadershipRole: CohortLeadershipRole.COHORT_CAPTAIN },
        });
      }
    }

    if (assistantUserId !== undefined) {
      if (assistantUserId === null) {
        await this.prisma.user.updateMany({
          where: {
            cohortId,
            role: UserRole.FELLOW,
            cohortLeadershipRole: CohortLeadershipRole.ASSISTANT_COHORT_CAPTAIN,
          },
          data: { cohortLeadershipRole: CohortLeadershipRole.NONE },
        });
      } else {
        await assertFellowInCohort(assistantUserId);
        await this.prisma.user.updateMany({
          where: {
            cohortId,
            role: UserRole.FELLOW,
            cohortLeadershipRole: CohortLeadershipRole.ASSISTANT_COHORT_CAPTAIN,
          },
          data: { cohortLeadershipRole: CohortLeadershipRole.NONE },
        });
        await this.prisma.user.update({
          where: { id: assistantUserId },
          data: {
            cohortLeadershipRole: CohortLeadershipRole.ASSISTANT_COHORT_CAPTAIN,
          },
        });
      }
    }

    const [captain, assistant] = await Promise.all([
      this.prisma.user.findFirst({
        where: {
          cohortId,
          role: UserRole.FELLOW,
          cohortLeadershipRole: CohortLeadershipRole.COHORT_CAPTAIN,
        },
        select: { id: true, firstName: true, lastName: true },
      }),
      this.prisma.user.findFirst({
        where: {
          cohortId,
          role: UserRole.FELLOW,
          cohortLeadershipRole: CohortLeadershipRole.ASSISTANT_COHORT_CAPTAIN,
        },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

    return { captain, assistant };
  }
}
