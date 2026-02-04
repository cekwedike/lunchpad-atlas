import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { UpdateUserDto, ChangePasswordDto, UserStatsDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
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

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const [resourcesCompleted, discussionsPosted, quizzesTaken, pointsData] = await Promise.all([
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
    ]);

    return {
      resourcesCompleted,
      discussionsPosted,
      quizzesTaken,
      totalPoints: pointsData._sum.points || 0,
      currentStreak: 0, // TODO: Calculate based on engagement events
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
}
