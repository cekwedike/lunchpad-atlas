import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { computeEngagementDayStreak } from '../common/engagement-streak';
import { UpdateUserDto, ChangePasswordDto, UserStatsDto } from './dto/user.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        cohortId: true,
        createdAt: true,
        emailNotifications: true,
        isSuspended: true,
        suspensionReason: true,
        mustChangePassword: true,
        onboardingChecklistDismissed: true,
        onboardingTourCompleted: true,
        onboardingNotifReviewed: true,
        cohort: {
          select: { id: true, name: true },
        },
        facilitatedCohorts: {
          select: {
            cohort: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim(),
    };
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const updateData: any = {};
    if (dto.name) {
      const parts = dto.name.split(' ');
      updateData.firstName = parts[0] || dto.name;
      updateData.lastName = parts.slice(1).join(' ') || '';
    }
    if (dto.emailNotifications !== undefined) {
      updateData.emailNotifications = dto.emailNotifications;
    }
    if (dto.onboardingChecklistDismissed !== undefined) {
      updateData.onboardingChecklistDismissed = dto.onboardingChecklistDismissed;
    }
    if (dto.onboardingTourCompleted !== undefined) {
      updateData.onboardingTourCompleted = dto.onboardingTourCompleted;
    }
    if (dto.onboardingNotifReviewed !== undefined) {
      updateData.onboardingNotifReviewed = dto.onboardingNotifReviewed;
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailNotifications: true,
        mustChangePassword: true,
        onboardingChecklistDismissed: true,
        onboardingTourCompleted: true,
        onboardingNotifReviewed: true,
      },
    });

    return {
      ...user,
      name: `${user.firstName} ${user.lastName}`.trim(),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    // Notify admins about the password change
    try {
      await this.notificationsService.notifyAdminsPasswordChanged(userId);
    } catch {
      // Non-critical
    }

    return { message: 'Password changed successfully' };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const [resourcesCompleted, discussionsPosted, quizzesTaken, pointsData, currentStreak] =
      await Promise.all([
        this.prisma.resourceProgress.count({
          where: { userId, state: 'COMPLETED' },
        }),
        this.prisma.discussion.count({
          where: { userId: userId },
        }),
        this.prisma.quizResponse.count({
          where: { userId },
        }),
        this.prisma.pointsLog.aggregate({
          where: { userId },
          _sum: { points: true },
        }),
        computeEngagementDayStreak(this.prisma, userId),
      ]);

    return {
      resourcesCompleted,
      discussionsPosted,
      quizzesTaken,
      totalPoints: pointsData._sum.points || 0,
      currentStreak,
    };
  }

  async getUserAchievements(userId: string) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async getMyPoints(userId: string) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [logs, totalAgg, user] = await Promise.all([
      this.prisma.pointsLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          eventType: true,
          points: true,
          description: true,
          createdAt: true,
        },
      }),
      this.prisma.pointsLog.aggregate({
        where: { userId },
        _sum: { points: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { currentMonthPoints: true },
      }),
    ]);

    return {
      totalPoints: totalAgg._sum.points ?? 0,
      currentMonthPoints: user?.currentMonthPoints ?? 0,
      recentActivity: logs,
    };
  }

  async getGuestSessions(userId: string) {
    return this.prisma.guestSession.findMany({
      where: { userId },
      select: {
        sessionId: true,
        session: {
          select: {
            id: true,
            sessionNumber: true,
            title: true,
            scheduledDate: true,
            cohortId: true,
          },
        },
      },
      orderBy: { session: { scheduledDate: 'asc' } },
    });
  }

  /** Heartbeat: accumulate active seconds per UTC day (capped per request for abuse resistance). */
  async recordPlatformTimeSeconds(userId: string, seconds: number) {
    const add = Math.min(120, Math.max(0, Math.floor(seconds)));
    if (add === 0) return { ok: true as const, added: 0 };
    const now = new Date();
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    await this.prisma.platformTimeDaily.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, seconds: add },
      update: { seconds: { increment: add } },
    });
    return { ok: true as const, added: add };
  }
}
