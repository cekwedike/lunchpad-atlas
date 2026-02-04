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
        name: true,
        role: true,
        bio: true,
        points: true,
        cohortId: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        bio: true,
        points: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    const [resourcesCompleted, discussionsPosted, quizzesTaken, user] = await Promise.all([
      this.prisma.resourceProgress.count({
        where: { userId, state: 'COMPLETED' },
      }),
      this.prisma.discussion.count({
        where: { authorId: userId },
      }),
      this.prisma.quizResponse.count({
        where: { userId },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
      }),
    ]);

    return {
      resourcesCompleted,
      discussionsPosted,
      quizzesTaken,
      totalPoints: user?.points || 0,
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
