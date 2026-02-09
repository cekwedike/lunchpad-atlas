import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LeaderboardFilterDto, LeaderboardAdjustPointsDto } from './dto/leaderboard.dto';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(filterDto: LeaderboardFilterDto) {
    const { month, cohortId, year, page = 1, limit = 20 } = filterDto;
    const skip = (page - 1) * limit;

    // Calculate date range for month filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month) {
      const currentYear = year || new Date().getFullYear();
      startDate = new Date(currentYear, month - 1, 1);
      endDate = new Date(currentYear, month, 0, 23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    // Build where clause
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      user: {
        role: 'FELLOW',
      },
    };

    if (cohortId) {
      where.user.cohortId = cohortId;
    }

    // Get aggregated points by user
    const pointsData = await this.prisma.pointsLog.groupBy({
      by: ['userId'],
      where,
      _sum: {
        points: true,
      },
      orderBy: {
        _sum: {
          points: 'desc',
        },
      },
      skip,
      take: limit,
    });

    // Get total count for pagination
    const totalUsers = await this.prisma.pointsLog
      .groupBy({
        by: ['userId'],
        where,
      })
      .then((result) => result.length);

    // Fetch user details and calculate streaks
    const leaderboardData = await Promise.all(
      pointsData.map(async (entry, index) => {
        const user = await this.prisma.user.findUnique({
          where: { id: entry.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            cohortId: true,
          },
        });

        // Calculate current streak
        const streak = await this.calculateStreak(entry.userId);

        return {
          userId: entry.userId,
          userName: user
            ? `${user.firstName} ${user.lastName}`.trim()
            : 'Unknown',
          email: user?.email || '',
          cohortId: user?.cohortId,
          points: entry._sum.points || 0,
          rank: skip + index + 1,
          streak,
        };
      }),
    );

    const totalPages = Math.ceil(totalUsers / limit);

    return {
      data: leaderboardData,
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

    if (month) {
      const currentYear = year || new Date().getFullYear();
      startDate = new Date(currentYear, month - 1, 1);
      endDate = new Date(currentYear, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
    }

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      user: {
        role: 'FELLOW',
      },
    };

    if (cohortId) {
      where.user.cohortId = cohortId;
    }

    // Get all users ranked by points
    const allRankings = await this.prisma.pointsLog.groupBy({
      by: ['userId'],
      where,
      _sum: {
        points: true,
      },
      orderBy: {
        _sum: {
          points: 'desc',
        },
      },
    });

    // Find user's position
    const userRankIndex = allRankings.findIndex(
      (entry) => entry.userId === userId,
    );

    if (userRankIndex === -1) {
      return {
        rank: null,
        totalUsers: allRankings.length,
        points: 0,
        message: 'User has no activity in this period',
      };
    }

    const userPoints = allRankings[userRankIndex]._sum.points || 0;
    const streak = await this.calculateStreak(userId);
    return {
      rank: userRankIndex + 1,
      totalUsers: allRankings.length,
      points: userPoints,
      streak,
      userId,
      userName: user
        ? `${user.firstName} ${user.lastName}`.trim()
        : 'Unknown',
      email: user?.email || '',
    };
  }

  async adjustPoints(adminId: string, dto: LeaderboardAdjustPointsDto) {
    const { userId, points, description } = dto;

    if (!Number.isFinite(points) || points === 0) {
      throw new BadRequestException('Points must be a non-zero number');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
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
          adjustedBy: adminId,
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
}
