import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LeaderboardFilterDto, LeaderboardAdjustPointsDto } from './dto/leaderboard.dto';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  private buildMonthRange(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  private async getCohortActiveRange(cohortId: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { id: true, state: true, startDate: true, endDate: true },
    });

    if (!cohort || cohort.state !== 'ACTIVE') {
      return null;
    }

    const now = new Date();
    const end = cohort.endDate < now ? cohort.endDate : now;
    if (end < cohort.startDate) return null;

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

  private calculateConsecutiveStreak(days: Set<string>, referenceDate: Date) {
    if (days.size === 0) return 0;

    const sortedDays = Array.from(days).sort().reverse();
    const reference = new Date(referenceDate);
    reference.setHours(0, 0, 0, 0);
    const referenceStr = reference.toISOString().split('T')[0];

    const yesterday = new Date(reference);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (sortedDays[0] !== referenceStr && sortedDays[0] !== yesterdayStr) {
      return 0;
    }

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

  async getLeaderboard(filterDto: LeaderboardFilterDto) {
    const { month, cohortId, year, page = 1, limit = 20 } = filterDto;
    const skip = (page - 1) * limit;

    // Calculate date range for month filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;
    const monthRange = this.buildMonthRange(targetYear, targetMonth);
    startDate = monthRange.startDate;
    endDate = monthRange.endDate;

    let cohortRange: { startDate: Date; endDate: Date } | null = null;
    if (cohortId) {
      cohortRange = await this.getCohortActiveRange(cohortId);
      if (!cohortRange || !this.isRangeWithin(startDate, endDate, cohortRange)) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
        };
      }
    }

    // Build where clause
    const fellowWhere: any = {
      role: 'FELLOW',
    };

    if (cohortId) {
      fellowWhere.cohortId = cohortId;
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

    const pointsWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
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
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { userId: true, createdAt: true },
    });

    const discussionComments = await this.prisma.discussionComment.findMany({
      where: {
        userId: { in: fellowIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
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
        endDate,
      );
      const chatBonus =
        this.calculateChatCountBonus(chatCount) +
        this.calculateStreakBonus(chatStreak);

      const activityStreak = this.calculateConsecutiveStreak(
        activityDays.get(user.id) || new Set(),
        endDate,
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

    leaderboardRows.sort((a, b) => b.points - a.points || b.basePoints - a.basePoints);

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

  async getUserRank(userId: string, filterDto: LeaderboardFilterDto) {
    const { month, cohortId, year } = filterDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
        userId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        message: 'Only fellows appear on the leaderboard',
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

    let cohortRange: { startDate: Date; endDate: Date } | null = null;
    if (cohortId) {
      cohortRange = await this.getCohortActiveRange(cohortId);
      if (!cohortRange || !this.isRangeWithin(startDate, endDate, cohortRange)) {
        return {
          rank: null,
          totalUsers: 0,
          points: 0,
          streak: 0,
          userId,
          userName: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          message: 'Leaderboard is only available during active cohort months',
        };
      }
    }

    const fellowWhere: any = {
      role: 'FELLOW',
    };

    if (cohortId) {
      fellowWhere.cohortId = cohortId;
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
        userId,
        userName: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        message: 'No fellows in this cohort',
      };
    }

    const pointsWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
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
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { userId: true, createdAt: true },
    });

    const discussionComments = await this.prisma.discussionComment.findMany({
      where: {
        userId: { in: fellowIds },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
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
        endDate,
      );
      const chatBonus =
        this.calculateChatCountBonus(chatCount) +
        this.calculateStreakBonus(chatStreak);

      const activityStreak = this.calculateConsecutiveStreak(
        activityDays.get(entry.id) || new Set(),
        endDate,
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

    leaderboardRows.sort((a, b) => b.points - a.points || b.basePoints - a.basePoints);
    const userRankIndex = leaderboardRows.findIndex((row) => row.userId === userId);

    if (userRankIndex === -1) {
      return {
        rank: null,
        totalUsers: leaderboardRows.length,
        points: 0,
        streak: 0,
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
      userId,
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
      const facilitator = await this.prisma.user.findUnique({
        where: { id: adjustedById },
        select: { cohortId: true },
      });

      if (!facilitator?.cohortId || facilitator.cohortId !== user.cohortId) {
        throw new BadRequestException('Facilitators can only adjust points for their cohort');
      }
    }

    const now = new Date();
    const lastReset = user.lastPointReset;
    const needsReset =
      !lastReset ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentMonthPoints: needsReset
          ? points
          : { increment: points },
        lastPointReset: needsReset ? now : undefined,
      },
    });

    const log = await this.prisma.pointsLog.create({
      data: {
        userId,
        points,
        eventType: 'ADMIN_ADJUSTMENT' as any,
        description,
        metadata: {
          adjustedBy: adjustedById,
        },
      },
    });

    return { success: true, logId: log.id };
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

    if (!resolvedCohortId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });
      resolvedCohortId = user?.cohortId || undefined;
    }

    if (resolvedCohortId && (userRole === 'FACILITATOR' || userRole === 'FELLOW')) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });
      if (user?.cohortId && user.cohortId !== resolvedCohortId) {
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

    const start = new Date(cohortRange.startDate.getFullYear(), cohortRange.startDate.getMonth(), 1);
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
