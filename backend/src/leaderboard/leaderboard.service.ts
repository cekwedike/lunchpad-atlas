import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  LeaderboardFilterDto,
  LeaderboardAdjustPointsDto,
  LeaderboardFellowBreakdownQueryDto,
} from './dto/leaderboard.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { PointsService } from '../gamification/points.service';

/** Resolved cohort visibility for leaderboard lists and rank (privacy). */
export type LeaderboardCohortScope =
  | { kind: 'ALL' }
  | { kind: 'COHORT'; cohortId: string }
  | { kind: 'EMPTY' };

@Injectable()
export class LeaderboardService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private pointsService: PointsService,
  ) {}

  private buildMonthRange(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  private async getCohortActiveRange(cohortId: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { id: true, startDate: true, endDate: true },
    });

    if (!cohort) {
      return null;
    }

    const now = new Date();
    const end = cohort.endDate < now ? cohort.endDate : now;

    return {
      startDate: cohort.startDate,
      endDate: end,
    };
  }

  private isRangeWithin(start: Date, end: Date, cohortRange: { startDate: Date; endDate: Date }) {
    if (end < cohortRange.startDate) return false;
    if (start > cohortRange.endDate) return false;
    return true;
  }

  /**
   * Consecutive calendar days with activity, counting backward from the user's
   * most recent active day in `days` (YYYY-MM-DD keys).
   *
   * Previously this compared that day to the month `endDate`, which is almost
   * always wrong (e.g. last activity on the 7th vs reference the 30th → 0 streak).
   */
  private calculateConsecutiveStreak(days: Set<string>) {
    if (days.size === 0) return 0;

    const sortedDays = Array.from(days).sort().reverse();

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

  private calculateStreakBonus(streak: number) {
    if (streak >= 28) return 25;
    if (streak >= 21) return 20;
    if (streak >= 14) return 15;
    if (streak >= 7) return 10;
    return 0;
  }

  private calculateChatCountBonus(chatCount: number) {
    return chatCount >= 50 ? 30 : 0;
  }

  private compareLeaderboardRows(
    a: { points: number; streak: number; basePoints: number; userName: string; userId: string },
    b: { points: number; streak: number; basePoints: number; userName: string; userId: string },
  ) {
    return (
      b.points - a.points ||
      b.streak - a.streak ||
      b.basePoints - a.basePoints ||
      a.userName.localeCompare(b.userName) ||
      a.userId.localeCompare(b.userId)
    );
  }

  /**
   * Enforces role-based cohort boundaries: fellows see only their cohort; facilitators
   * must pass cohortId and must facilitate it; admins may omit cohortId for org-wide view.
   */
  async resolveLeaderboardCohortScope(
    viewerId: string,
    viewerRole: string,
    queryCohortId?: string,
  ): Promise<LeaderboardCohortScope> {
    if (viewerRole === 'ADMIN') {
      if (queryCohortId) return { kind: 'COHORT', cohortId: queryCohortId };
      return { kind: 'ALL' };
    }

    if (viewerRole === 'FELLOW') {
      const u = await this.prisma.user.findUnique({
        where: { id: viewerId },
        select: { cohortId: true },
      });
      if (!u?.cohortId) return { kind: 'EMPTY' };
      if (queryCohortId && queryCohortId !== u.cohortId) {
        throw new ForbiddenException('You can only view your cohort leaderboard');
      }
      return { kind: 'COHORT', cohortId: u.cohortId };
    }

    if (viewerRole === 'FACILITATOR') {
      if (!queryCohortId) {
        throw new BadRequestException('cohortId query parameter is required');
      }
      const link = await this.prisma.cohortFacilitator.findFirst({
        where: { userId: viewerId, cohortId: queryCohortId },
      });
      if (!link) {
        throw new ForbiddenException('You are not a facilitator for this cohort');
      }
      return { kind: 'COHORT', cohortId: queryCohortId };
    }

    if (viewerRole === 'GUEST_FACILITATOR') {
      if (!queryCohortId) {
        throw new BadRequestException('cohortId query parameter is required');
      }
      const ok = await this.prisma.guestSession.findFirst({
        where: { userId: viewerId, session: { cohortId: queryCohortId } },
      });
      if (!ok) {
        throw new ForbiddenException('You do not have access to this cohort leaderboard');
      }
      return { kind: 'COHORT', cohortId: queryCohortId };
    }

    throw new ForbiddenException('Leaderboard is not available for your role');
  }

  async getLeaderboard(
    viewerId: string,
    viewerRole: string,
    filterDto: LeaderboardFilterDto,
  ) {
    const { month, year, page = 1, limit = 20 } = filterDto;
    const skip = (page - 1) * limit;

    const scope = await this.resolveLeaderboardCohortScope(
      viewerId,
      viewerRole,
      filterDto.cohortId,
    );

    if (scope.kind === 'EMPTY') {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Calculate date range for month filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;
    const monthRange = this.buildMonthRange(targetYear, targetMonth);
    startDate = monthRange.startDate;
    endDate = monthRange.endDate;

    // Build where clause
    const fellowWhere: any = {
      role: 'FELLOW',
    };

    if (scope.kind === 'COHORT') {
      fellowWhere.cohortId = scope.cohortId;
    }

    const fellows = await this.prisma.user.findMany({
      where: fellowWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        cohortId: true,
      },
    });

    const fellowIds = fellows.map((user) => user.id);

    if (fellowIds.length === 0) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // Always filter by the requested month's date range so scores are monthly
    const pointsWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
      userId: { in: fellowIds },
    };

    // Get aggregated points by user
    const pointsData = await this.prisma.pointsLog.groupBy({
      by: ['userId'],
      where: pointsWhere,
      _sum: {
        points: true,
      },
      orderBy: {
        _sum: {
          points: 'desc',
        },
      },
    });

    const basePointsMap = new Map<string, number>();
    pointsData.forEach((entry) => {
      basePointsMap.set(entry.userId, entry._sum.points || 0);
    });

    const chatMessages = await this.prisma.chatMessage.findMany({
      where: {
        userId: { in: fellowIds },
        isDeleted: false,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { userId: true, createdAt: true },
    });

    const discussionComments = await this.prisma.discussionComment.findMany({
      where: {
        userId: { in: fellowIds },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { userId: true, createdAt: true },
    });

    const pointsEvents = await this.prisma.pointsLog.findMany({
      where: pointsWhere,
      select: { userId: true, createdAt: true },
    });

    const chatCounts = new Map<string, number>();
    const chatDays = new Map<string, Set<string>>();
    chatMessages.forEach((message) => {
      chatCounts.set(message.userId, (chatCounts.get(message.userId) || 0) + 1);
      const date = new Date(message.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      if (!chatDays.has(message.userId)) {
        chatDays.set(message.userId, new Set());
      }
      chatDays.get(message.userId)?.add(key);
    });

    discussionComments.forEach((comment) => {
      chatCounts.set(comment.userId, (chatCounts.get(comment.userId) || 0) + 1);
      const date = new Date(comment.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      if (!chatDays.has(comment.userId)) {
        chatDays.set(comment.userId, new Set());
      }
      chatDays.get(comment.userId)?.add(key);
    });

    const activityDays = new Map<string, Set<string>>();
    const addActivityDay = (userId: string, createdAt: Date) => {
      const date = new Date(createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      if (!activityDays.has(userId)) {
        activityDays.set(userId, new Set());
      }
      activityDays.get(userId)?.add(key);
    };

    pointsEvents.forEach((event) => addActivityDay(event.userId, event.createdAt));
    chatMessages.forEach((message) => addActivityDay(message.userId, message.createdAt));
    discussionComments.forEach((comment) => addActivityDay(comment.userId, comment.createdAt));

    const leaderboardRows = fellows.map((user) => {
      const basePoints = basePointsMap.get(user.id) || 0;
      const chatCount = chatCounts.get(user.id) || 0;
      const chatStreak = this.calculateConsecutiveStreak(
        chatDays.get(user.id) || new Set(),
      );
      const chatBonus =
        this.calculateChatCountBonus(chatCount) +
        this.calculateStreakBonus(chatStreak);

      const activityStreak = this.calculateConsecutiveStreak(
        activityDays.get(user.id) || new Set(),
      );
      const streakBonus = this.calculateStreakBonus(activityStreak);

      const bonusPoints = chatBonus + streakBonus;
      const totalPoints = basePoints + bonusPoints;

      return {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        cohortId: user.cohortId,
        points: totalPoints,
        basePoints,
        bonusPoints,
        chatBonus,
        chatCount,
        chatStreak,
        streak: activityStreak,
        streakBonus,
      };
    });

    leaderboardRows.sort((a, b) => this.compareLeaderboardRows(a, b));

    const totalUsers = leaderboardRows.length;
    const pagedRows = leaderboardRows.slice(skip, skip + limit).map((row, index) => ({
      ...row,
      rank: skip + index + 1,
    }));

    const totalPages = Math.ceil(totalUsers / limit);

    return {
      data: pagedRows,
      total: totalUsers,
      page,
      limit,
      totalPages,
    };
  }

  async getUserRank(
    viewerId: string,
    viewerRole: string,
    filterDto: LeaderboardFilterDto,
  ) {
    const { month, year } = filterDto;

    const user = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { id: true, role: true, firstName: true, lastName: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'FELLOW') {
      return {
        rank: null,
        totalUsers: 0,
        points: 0,
        streak: 0,
        userId: viewerId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        message: 'Only fellows appear on the leaderboard',
      };
    }

    const scope = await this.resolveLeaderboardCohortScope(
      viewerId,
      viewerRole,
      filterDto.cohortId,
    );

    if (scope.kind === 'EMPTY') {
      return {
        rank: null,
        totalUsers: 0,
        points: 0,
        streak: 0,
        userId: viewerId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        message: 'No cohort assigned',
      };
    }

    // Calculate date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;
    const monthRange = this.buildMonthRange(targetYear, targetMonth);
    startDate = monthRange.startDate;
    endDate = monthRange.endDate;

    const fellowWhere: any = {
      role: 'FELLOW',
    };

    if (scope.kind === 'COHORT') {
      fellowWhere.cohortId = scope.cohortId;
    }

    const fellows = await this.prisma.user.findMany({
      where: fellowWhere,
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const fellowIds = fellows.map((entry) => entry.id);

    if (fellowIds.length === 0) {
      return {
        rank: null,
        totalUsers: 0,
        points: 0,
        streak: 0,
        userId: viewerId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        message: 'No fellows in this cohort',
      };
    }

    // Always filter by the requested month's date range so scores are monthly
    const pointsWhere: any = {
      createdAt: { gte: startDate, lte: endDate },
      userId: { in: fellowIds },
    };

    const pointsData = await this.prisma.pointsLog.groupBy({
      by: ['userId'],
      where: pointsWhere,
      _sum: { points: true },
    });

    const basePointsMap = new Map<string, number>();
    pointsData.forEach((entry) => {
      basePointsMap.set(entry.userId, entry._sum.points || 0);
    });

    const chatMessages = await this.prisma.chatMessage.findMany({
      where: {
        userId: { in: fellowIds },
        isDeleted: false,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { userId: true, createdAt: true },
    });

    const discussionComments = await this.prisma.discussionComment.findMany({
      where: {
        userId: { in: fellowIds },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { userId: true, createdAt: true },
    });

    const pointsEvents = await this.prisma.pointsLog.findMany({
      where: pointsWhere,
      select: { userId: true, createdAt: true },
    });

    const chatCounts = new Map<string, number>();
    const chatDays = new Map<string, Set<string>>();
    chatMessages.forEach((message) => {
      chatCounts.set(message.userId, (chatCounts.get(message.userId) || 0) + 1);
      const date = new Date(message.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      if (!chatDays.has(message.userId)) {
        chatDays.set(message.userId, new Set());
      }
      chatDays.get(message.userId)?.add(key);
    });

    discussionComments.forEach((comment) => {
      chatCounts.set(comment.userId, (chatCounts.get(comment.userId) || 0) + 1);
      const date = new Date(comment.createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      if (!chatDays.has(comment.userId)) {
        chatDays.set(comment.userId, new Set());
      }
      chatDays.get(comment.userId)?.add(key);
    });

    const activityDays = new Map<string, Set<string>>();
    const addActivityDay = (userId: string, createdAt: Date) => {
      const date = new Date(createdAt);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      if (!activityDays.has(userId)) {
        activityDays.set(userId, new Set());
      }
      activityDays.get(userId)?.add(key);
    };

    pointsEvents.forEach((event) => addActivityDay(event.userId, event.createdAt));
    chatMessages.forEach((message) => addActivityDay(message.userId, message.createdAt));
    discussionComments.forEach((comment) => addActivityDay(comment.userId, comment.createdAt));

    const leaderboardRows = fellows.map((entry) => {
      const basePoints = basePointsMap.get(entry.id) || 0;
      const chatCount = chatCounts.get(entry.id) || 0;
      const chatStreak = this.calculateConsecutiveStreak(
        chatDays.get(entry.id) || new Set(),
      );
      const chatBonus =
        this.calculateChatCountBonus(chatCount) +
        this.calculateStreakBonus(chatStreak);

      const activityStreak = this.calculateConsecutiveStreak(
        activityDays.get(entry.id) || new Set(),
      );
      const streakBonus = this.calculateStreakBonus(activityStreak);

      const bonusPoints = chatBonus + streakBonus;
      const totalPoints = basePoints + bonusPoints;

      return {
        userId: entry.id,
        userName: `${entry.firstName} ${entry.lastName}`.trim(),
        email: entry.email,
        points: totalPoints,
        basePoints,
        bonusPoints,
        chatBonus,
        chatCount,
        chatStreak,
        streak: activityStreak,
        streakBonus,
      };
    });

    leaderboardRows.sort((a, b) => this.compareLeaderboardRows(a, b));
    const userRankIndex = leaderboardRows.findIndex((row) => row.userId === viewerId);

    if (userRankIndex === -1) {
      return {
        rank: null,
        totalUsers: leaderboardRows.length,
        points: 0,
        streak: 0,
        userId: viewerId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        message: 'User has no activity in this period',
      };
    }

    const rankedUser = leaderboardRows[userRankIndex];

    return {
      rank: userRankIndex + 1,
      totalUsers: leaderboardRows.length,
      points: rankedUser.points,
      basePoints: rankedUser.basePoints,
      bonusPoints: rankedUser.bonusPoints,
      chatBonus: rankedUser.chatBonus,
      chatCount: rankedUser.chatCount,
      chatStreak: rankedUser.chatStreak,
      streak: rankedUser.streak,
      streakBonus: rankedUser.streakBonus,
      userId: viewerId,
      userName: rankedUser.userName,
      email: rankedUser.email,
    };
  }

  async adjustPoints(adjustedById: string, adjustedByRole: string, dto: LeaderboardAdjustPointsDto) {
    const { userId, points, description } = dto;

    if (!Number.isFinite(points) || points === 0) {
      throw new BadRequestException('Points must be a non-zero number');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        cohortId: true,
        currentMonthPoints: true,
        lastPointReset: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'FELLOW') {
      throw new BadRequestException('Only fellows can receive leaderboard points');
    }

    if (adjustedByRole === 'FACILITATOR') {
      if (!user.cohortId) {
        throw new BadRequestException('Fellow has no cohort');
      }
      const link = await this.prisma.cohortFacilitator.findFirst({
        where: { userId: adjustedById, cohortId: user.cohortId },
      });
      if (!link) {
        throw new BadRequestException(
          'Facilitators can only adjust points for fellows in cohorts they facilitate',
        );
      }
    }

    const bypassMonthlyCap =
      adjustedByRole === 'ADMIN' && dto.bypassMonthlyCap === true;

    const result = await this.pointsService.awardPoints({
      userId,
      points,
      eventType: 'ADMIN_ADJUSTMENT' as any,
      description,
      bypassMonthlyCap,
      metadata: {
        adjustedBy: adjustedById,
        bypassMonthlyCap,
      } as any,
    });

    // Notify the fellow about the points adjustment
    try {
      const adjuster = await this.prisma.user.findUnique({
        where: { id: adjustedById },
        select: { firstName: true, lastName: true },
      });
      const adjusterName = adjuster
        ? `${adjuster.firstName} ${adjuster.lastName}`
        : 'An administrator';
      await this.notificationsService.notifyPointsAdjusted(
        userId,
        adjusterName,
        points,
        description,
      );
    } catch {
      // Non-critical
    }

    return { success: result.awarded, capped: result.capped };
  }

  /**
   * Staff-only: how a fellow's monthly leaderboard total is composed (logged points + chat/streak bonuses).
   */
  async getFellowPointsBreakdown(
    viewerId: string,
    viewerRole: string,
    fellowUserId: string,
    query: LeaderboardFellowBreakdownQueryDto,
  ) {
    const fellow = await this.prisma.user.findUnique({
      where: { id: fellowUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        cohortId: true,
        role: true,
      },
    });

    if (!fellow || fellow.role !== 'FELLOW') {
      throw new NotFoundException('Fellow not found');
    }

    if (viewerRole === 'FACILITATOR') {
      if (!query.cohortId) {
        throw new BadRequestException('cohortId is required');
      }
      if (fellow.cohortId !== query.cohortId) {
        throw new ForbiddenException('Fellow is not in this cohort');
      }
      const link = await this.prisma.cohortFacilitator.findFirst({
        where: { userId: viewerId, cohortId: query.cohortId },
      });
      if (!link) {
        throw new ForbiddenException('You are not a facilitator for this cohort');
      }
    }

    if (viewerRole === 'ADMIN' && query.cohortId) {
      if (fellow.cohortId !== query.cohortId) {
        throw new BadRequestException('Fellow is not in the selected cohort');
      }
    }

    const now = new Date();
    const targetYear = query.year ?? now.getFullYear();
    const targetMonth = query.month ?? now.getMonth() + 1;
    const { startDate, endDate } = this.buildMonthRange(targetYear, targetMonth);

    const periodLabel = new Date(targetYear, targetMonth - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const pointsWhere = {
      userId: fellowUserId,
      createdAt: { gte: startDate, lte: endDate },
    };

    const [groupByEvent, baseAgg, adminLogs, chatMessages, discussionComments, pointsEvents] =
      await Promise.all([
        this.prisma.pointsLog.groupBy({
          by: ['eventType'],
          where: pointsWhere,
          _sum: { points: true },
        }),
        this.prisma.pointsLog.aggregate({
          where: pointsWhere,
          _sum: { points: true },
        }),
        this.prisma.pointsLog.findMany({
          where: { ...pointsWhere, eventType: 'ADMIN_ADJUSTMENT' },
          orderBy: { createdAt: 'desc' },
          select: {
            points: true,
            description: true,
            metadata: true,
            createdAt: true,
          },
        }),
        this.prisma.chatMessage.findMany({
          where: {
            userId: fellowUserId,
            isDeleted: false,
            createdAt: { gte: startDate, lte: endDate },
          },
          select: { createdAt: true },
        }),
        this.prisma.discussionComment.findMany({
          where: {
            userId: fellowUserId,
            createdAt: { gte: startDate, lte: endDate },
          },
          select: { createdAt: true },
        }),
        this.prisma.pointsLog.findMany({
          where: pointsWhere,
          select: { createdAt: true },
        }),
      ]);

    const basePoints = baseAgg._sum.points ?? 0;

    const chatCount = chatMessages.length + discussionComments.length;
    const chatDays = new Set<string>();
    const activityDays = new Set<string>();
    const addDayTo = (set: Set<string>, d: Date) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split('T')[0];
      set.add(key);
    };
    chatMessages.forEach((m) => addDayTo(chatDays, m.createdAt));
    discussionComments.forEach((c) => addDayTo(chatDays, c.createdAt));

    const chatStreak = this.calculateConsecutiveStreak(chatDays);
    const chatVolumeBonus = this.calculateChatCountBonus(chatCount);
    const chatStreakBonus = this.calculateStreakBonus(chatStreak);
    const chatBonus = chatVolumeBonus + chatStreakBonus;

    pointsEvents.forEach((e) => addDayTo(activityDays, e.createdAt));
    chatMessages.forEach((m) => addDayTo(activityDays, m.createdAt));
    discussionComments.forEach((c) => addDayTo(activityDays, c.createdAt));

    const activityStreak = this.calculateConsecutiveStreak(activityDays);
    const streakBonus = this.calculateStreakBonus(activityStreak);

    const bonusPoints = chatBonus + streakBonus;
    const totalPoints = basePoints + bonusPoints;

    const achievementGrants: Array<{ name: string; points: number; createdAt: string }> = [];
    const manualAdjustments: Array<{ description: string; points: number; createdAt: string }> = [];

    for (const log of adminLogs) {
      const meta = log.metadata as Record<string, unknown> | null;
      const isAchievement =
        meta != null &&
        (typeof meta.achievementId === 'string' || typeof meta.achievementName === 'string');
      const createdAtIso = log.createdAt.toISOString();
      if (isAchievement) {
        const name =
          typeof meta.achievementName === 'string' && meta.achievementName.length > 0
            ? meta.achievementName
            : 'Achievement bonus';
        achievementGrants.push({ name, points: log.points, createdAt: createdAtIso });
      } else {
        manualAdjustments.push({
          description: log.description,
          points: log.points,
          createdAt: createdAtIso,
        });
      }
    }

    const eventLabels: Record<string, string> = {
      RESOURCE_VIEW: 'Resource views',
      RESOURCE_COMPLETE: 'Resources completed',
      DISCUSSION_POST: 'Discussions posted',
      DISCUSSION_COMMENT: 'Discussion comments',
      DISCUSSION_QUALITY_SCORE: 'Discussion quality',
      COMMENT_QUALITY_SCORE: 'Comment quality',
      ADMIN_ADJUSTMENT: 'Adjustments & bonuses',
      QUIZ_SUBMIT: 'Quizzes',
      CHAT_MESSAGE: 'Chat messages',
      SESSION_ATTEND: 'Attendance',
    };

    const byEventType: Array<{ eventType: string; label: string; points: number }> = [];
    for (const row of groupByEvent) {
      if (row.eventType === 'ADMIN_ADJUSTMENT') continue;
      const pts = row._sum.points ?? 0;
      byEventType.push({
        eventType: row.eventType,
        label: eventLabels[row.eventType] ?? row.eventType,
        points: pts,
      });
    }

    if (achievementGrants.length > 0) {
      const achSum = achievementGrants.reduce((s, a) => s + a.points, 0);
      byEventType.push({
        eventType: 'ACHIEVEMENT_BONUS',
        label: 'Achievement bonuses',
        points: achSum,
      });
    }
    if (manualAdjustments.length > 0) {
      const manSum = manualAdjustments.reduce((s, a) => s + a.points, 0);
      byEventType.push({
        eventType: 'MANUAL_ADJUSTMENT',
        label: 'Manual points (staff)',
        points: manSum,
      });
    }
    byEventType.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));

    const recentEntries = await this.prisma.pointsLog.findMany({
      where: pointsWhere,
      orderBy: { createdAt: 'desc' },
      take: 80,
      select: {
        id: true,
        points: true,
        eventType: true,
        description: true,
        createdAt: true,
        metadata: true,
      },
    });

    let cohortName: string | null = null;
    if (fellow.cohortId) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: fellow.cohortId },
        select: { name: true },
      });
      cohortName = cohort?.name ?? null;
    }

    return {
      fellow: {
        id: fellow.id,
        firstName: fellow.firstName,
        lastName: fellow.lastName,
        email: fellow.email,
        cohortId: fellow.cohortId,
      },
      cohortName,
      month: targetMonth,
      year: targetYear,
      periodLabel,
      leaderboard: {
        totalPoints,
        basePoints,
        bonusPoints,
        chatBonus,
        streakBonus,
        chatCount,
        chatStreak,
        activityStreak,
        chatVolumeBonus,
        chatStreakBonus,
      },
      byEventType,
      achievementGrants,
      manualAdjustments,
      recentEntries: recentEntries.map((e) => ({
        id: e.id,
        points: e.points,
        eventType: e.eventType,
        label: eventLabels[e.eventType] ?? e.eventType,
        description: e.description,
        createdAt: e.createdAt.toISOString(),
        isAchievementBonus:
          e.eventType === 'ADMIN_ADJUSTMENT' &&
          (() => {
            const m = e.metadata as Record<string, unknown> | null;
            return m != null && (typeof m.achievementId === 'string' || typeof m.achievementName === 'string');
          })(),
      })),
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    // Get engagement events ordered by date (resource completions, quiz submissions, discussions)
    const events = await this.prisma.pointsLog.findMany({
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

    // Group events by day
    const uniqueDays = new Set<string>();
    events.forEach((event) => {
      const date = new Date(event.createdAt);
      date.setHours(0, 0, 0, 0);
      uniqueDays.add(date.toISOString().split('T')[0]);
    });

    const sortedDays = Array.from(uniqueDays).sort().reverse();

    if (sortedDays.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Check if user was active today or yesterday
    if (sortedDays[0] !== todayStr && sortedDays[0] !== yesterdayStr) {
      return 0; // Streak broken
    }

    // Count consecutive days
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

  async getAvailableMonths(userId: string, userRole: string, cohortId?: string) {
    let resolvedCohortId = cohortId;

    if (userRole === 'FELLOW') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });
      if (cohortId && cohortId !== user?.cohortId) {
        return { months: [] };
      }
      resolvedCohortId = user?.cohortId || undefined;
    } else if (userRole === 'FACILITATOR') {
      if (cohortId) {
        const link = await this.prisma.cohortFacilitator.findFirst({
          where: { userId, cohortId },
        });
        if (!link) return { months: [] };
        resolvedCohortId = cohortId;
      } else {
        const link = await this.prisma.cohortFacilitator.findFirst({
          where: { userId },
          select: { cohortId: true },
        });
        resolvedCohortId = link?.cohortId;
      }
    } else if (userRole === 'GUEST_FACILITATOR') {
      if (cohortId) {
        const ok = await this.prisma.guestSession.findFirst({
          where: { userId, session: { cohortId } },
        });
        if (!ok) return { months: [] };
        resolvedCohortId = cohortId;
      } else {
        const gs = await this.prisma.guestSession.findFirst({
          where: { userId },
          include: { session: { select: { cohortId: true } } },
        });
        resolvedCohortId = gs?.session?.cohortId ?? undefined;
      }
    } else if (userRole === 'ADMIN') {
      if (!resolvedCohortId) {
        return { months: [] };
      }
    }

    if (!resolvedCohortId) {
      return { months: [] };
    }

    const cohortRange = await this.getCohortActiveRange(resolvedCohortId);
    if (!cohortRange) {
      return { months: [] };
    }

    const now = new Date();
    // If the cohort hasn't started yet, show months from now (so the current month is
    // always available). Otherwise show from cohort start up to now (or cohort end).
    const effectiveStart =
      cohortRange.startDate > now
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(cohortRange.startDate.getFullYear(), cohortRange.startDate.getMonth(), 1);
    // cohortRange.endDate is already min(cohort.endDate, now) from getCohortActiveRange
    const start = effectiveStart;
    const end = new Date(cohortRange.endDate.getFullYear(), cohortRange.endDate.getMonth(), 1);

    const months: Array<{ month: number; year: number; label: string }> = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const month = cursor.getMonth() + 1;
      const year = cursor.getFullYear();
      months.push({
        month,
        year,
        label: cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { months };
  }
}
