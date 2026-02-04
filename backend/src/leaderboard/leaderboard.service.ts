import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LeaderboardFilterDto } from './dto/leaderboard.dto';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(filterDto: LeaderboardFilterDto) {
    const { month, cohortId, page = 1, limit = 20 } = filterDto;
    const skip = (page - 1) * limit;

    // Calculate date range for month filtering
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month) {
      const currentYear = new Date().getFullYear();
      startDate = new Date(currentYear, month - 1, 1);
      endDate = new Date(currentYear, month, 0, 23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Build where clause
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (cohortId) {
      where.user = { cohortId };
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
          userName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
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
    const { month, cohortId } = filterDto;

    // Calculate date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (month) {
      const currentYear = new Date().getFullYear();
      startDate = new Date(currentYear, month - 1, 1);
      endDate = new Date(currentYear, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (cohortId) {
      where.user = { cohortId };
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
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    // Get all point logs ordered by date
    const logs = await this.prisma.pointsLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (logs.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const log of logs) {
      const logDate = new Date(log.createdAt);
      logDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // If log is from today or yesterday, continue streak
      if (diffDays === 0 || diffDays === 1) {
        if (diffDays === 1) {
          streak++;
          currentDate = logDate;
        }
      } else {
        break;
      }
    }

    return streak;
  }
}
