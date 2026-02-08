import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

export interface UserFilters {
  search?: string;
  role?: UserRole | UserRole[];
  cohortId?: string;
  hasActivity?: boolean;
  page?: number;
  limit?: number;
}

export interface UserActivityEntry {
  timestamp: Date;
  type:
    | 'resource_completed'
    | 'discussion_created'
    | 'points_awarded'
    | 'quiz_completed'
    | 'login';
  description: string;
  metadata?: any;
}

@Injectable()
export class AdminUserService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Get paginated list of users with filters and search
   */
  async getAllUsers(filters: UserFilters = {}) {
    const {
      search,
      role,
      cohortId,
      hasActivity,
      page = 1,
      limit = 50,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    // Search by name or email
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by role(s)
    if (role) {
      if (Array.isArray(role)) {
        where.role = { in: role };
      } else {
        where.role = role;
      }
    }

    // Filter by cohort
    if (cohortId) {
      where.cohortId = cohortId;
    }

    // Filter users with activity (has resource progress or discussions)
    if (hasActivity !== undefined) {
      if (hasActivity) {
        where.OR = [
          { resourceProgress: { some: {} } },
          { discussions: { some: {} } },
        ];
      }
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          cohort: {
            select: {
              id: true,
              name: true,
            },
          },
          resourceProgress: {
            select: { id: true },
          },
          discussions: {
            select: { id: true },
          },
          quizResponses: {
            select: { id: true },
          },
          _count: {
            select: {
              resourceProgress: true,
              discussions: true,
              quizResponses: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.user.count({ where }),
    ]);

    const now = new Date();
    const activeThresholdMs = 60 * 60 * 1000;

    const usersWithStatus = users.map((user) => {
      const lastActiveAt = user.lastLoginAt;
      const lastActiveMs = lastActiveAt
        ? now.getTime() - lastActiveAt.getTime()
        : null;
      const lastActiveMinutes = lastActiveMs !== null
        ? Math.max(0, Math.floor(lastActiveMs / 60000))
        : null;
      const lastActiveSeconds = lastActiveMs !== null
        ? Math.max(0, Math.floor(lastActiveMs / 1000))
        : null;
      const isActive = lastActiveMs !== null ? lastActiveMs <= activeThresholdMs : false;

      return {
        ...user,
        lastActiveAt,
        lastActiveMinutes,
        lastActiveSeconds,
        isActive,
        statistics: {
          totalPoints: user.currentMonthPoints,
        },
      };
    });

    return {
      users: usersWithStatus,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user details by ID
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        cohort: true,
        resourceProgress: {
          include: {
            resource: {
              select: {
                id: true,
                title: true,
                type: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        },
        discussions: {
          include: {
            resource: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        quizResponses: {
          orderBy: { completedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            resourceProgress: true,
            discussions: true,
            quizResponses: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const now = new Date();
    const lastActiveAt = user.lastLoginAt;
    const lastActiveSeconds = lastActiveAt
      ? Math.max(0, Math.floor((now.getTime() - lastActiveAt.getTime()) / 1000))
      : null;

    return {
      ...user,
      lastActiveAt,
      lastActiveSeconds,
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (role === 'FACILITATOR' && !user.cohortId) {
      throw new BadRequestException('Facilitators must be assigned to a cohort');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });

    const adminName =
      `${admin?.firstName || ''} ${admin?.lastName || ''}`.trim() || 'Admin';

    await this.notificationsService.notifyUserPromoted(userId, role, adminName);
    await this.notificationsService.notifyAdminsUserUpdated(
      userId,
      adminName,
      `role changed to ${role}`,
    );

    return updatedUser;
  }

  /**
   * Update user cohort assignment
   */
  async updateUserCohort(userId: string, cohortId: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (cohortId) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: cohortId },
      });

      if (!cohort) {
        throw new NotFoundException(`Cohort with ID ${cohortId} not found`);
      }
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { cohortId },
      include: {
        cohort: true,
      },
    });
  }

  /**
   * Reset user points to zero
   */
  async resetUserPoints(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { currentMonthPoints: 0, lastPointReset: new Date() },
    });
  }

  /**
   * Bulk assign users to a cohort
   */
  async bulkAssignCohort(userIds: string[], cohortId: string | null) {
    if (cohortId) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: cohortId },
      });

      if (!cohort) {
        throw new NotFoundException(`Cohort with ID ${cohortId} not found`);
      }
    }

    const result = await this.prisma.user.updateMany({
      where: {
        id: { in: userIds },
      },
      data: {
        cohortId,
      },
    });

    return {
      updated: result.count,
      message: `Successfully updated ${result.count} user(s)`,
    };
  }

  /**
   * Bulk update user roles
   */
  async bulkUpdateRole(userIds: string[], role: UserRole) {
    const result = await this.prisma.user.updateMany({
      where: {
        id: { in: userIds },
      },
      data: {
        role,
      },
    });

    return {
      updated: result.count,
      message: `Successfully updated ${result.count} user(s) to role ${role}`,
    };
  }

  /**
   * Get user activity timeline
   */
  async getUserActivity(
    userId: string,
    limit = 50,
  ): Promise<UserActivityEntry[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Gather activities from different sources
    const [resourceActivities, discussionActivities, quizActivities] =
      await Promise.all([
        // Resource completion activities
        this.prisma.resourceProgress.findMany({
          where: {
            userId,
            state: 'COMPLETED',
          },
          include: {
            resource: {
              select: {
                title: true,
                type: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: limit,
        }),

        // Discussion creation activities
        this.prisma.discussion.findMany({
          where: { userId },
          include: {
            resource: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),

        // Quiz submission activities
        this.prisma.quizResponse.findMany({
          where: { userId },
          include: {
            quiz: {
              select: {
                title: true,
              },
            },
          },
          orderBy: { completedAt: 'desc' },
          take: limit,
        }),
      ]);

    // Combine and format activities
    const activities: UserActivityEntry[] = [];

    // Resource activities
    resourceActivities.forEach((progress) => {
      if (progress.completedAt) {
        activities.push({
          timestamp: progress.completedAt,
          type: 'resource_completed',
          description: `Completed ${progress.resource.type.toLowerCase()}: "${progress.resource.title}"`,
          metadata: {
            resourceId: progress.resourceId,
            pointsAwarded: progress.pointsAwarded,
            timeSpent: Math.round(progress.timeSpent / 60),
          },
        });
      }

      if (progress.pointsAwarded > 0) {
        activities.push({
          timestamp: progress.completedAt || progress.updatedAt,
          type: 'points_awarded',
          description: `Earned ${progress.pointsAwarded} points from "${progress.resource.title}"`,
          metadata: {
            resourceId: progress.resourceId,
            points: progress.pointsAwarded,
          },
        });
      }
    });

    // Discussion activities
    discussionActivities.forEach((discussion) => {
      activities.push({
        timestamp: discussion.createdAt,
        type: 'discussion_created',
        description: discussion.resource
          ? `Started discussion on "${discussion.resource.title}": "${discussion.title}"`
          : `Started discussion: "${discussion.title}"`,
        metadata: {
          discussionId: discussion.id,
          resourceId: discussion.resourceId,
        },
      });
    });

    // Quiz activities
    quizActivities.forEach((submission) => {
      activities.push({
        timestamp: submission.completedAt,
        type: 'quiz_completed',
        description: `Completed quiz "${submission.quiz.title}" - Score: ${submission.score}%`,
        metadata: {
          quizId: submission.quizId,
          score: submission.score,
          pointsAwarded: submission.pointsAwarded,
        },
      });
    });

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, limit);
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(userId: string) {
    const user = await this.getUserById(userId);

    const [
      completedResources,
      inProgressResources,
      totalDiscussions,
      totalQuizzes,
      averageQuizScore,
      totalTimeSpent,
    ] = await Promise.all([
      this.prisma.resourceProgress.count({
        where: {
          userId,
          state: 'COMPLETED',
        },
      }),
      this.prisma.resourceProgress.count({
        where: {
          userId,
          state: 'IN_PROGRESS',
        },
      }),
      this.prisma.discussion.count({
        where: { userId },
      }),
      this.prisma.quizResponse.count({
        where: { userId },
      }),
      this.prisma.quizResponse.aggregate({
        where: { userId },
        _avg: {
          score: true,
        },
      }),
      this.prisma.resourceProgress.aggregate({
        where: { userId },
        _sum: {
          timeSpent: true,
        },
      }),
    ]);

    return {
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      cohort: user.cohort?.name || null,
      totalPoints: user.currentMonthPoints,
      completedResources,
      inProgressResources,
      totalDiscussions,
      totalQuizzes,
      averageQuizScore: averageQuizScore._avg.score
        ? Math.round(averageQuizScore._avg.score * 10) / 10
        : 0,
      totalTimeSpentMinutes: totalTimeSpent._sum.timeSpent
        ? Math.round(totalTimeSpent._sum.timeSpent / 60)
        : 0,
    };
  }

  /**
   * Delete a user (admin only)
   */
  async deleteUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete the user
    await this.prisma.user.delete({
      where: { id: userId },
    });

    // Log the admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: userId,
        changes: {
          deleted: {
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
          },
        },
      },
    });

    return {
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      },
    };
  }
}
