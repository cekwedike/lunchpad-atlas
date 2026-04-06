import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import {
  getCohortDurationMonths,
  getMonthlyCapForDuration,
} from '../common/gamification.utils';

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

/** Strip sensitive fields from a user object before returning to the client. */
function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}

@Injectable()
export class AdminUserService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
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

    // Compute live points from pointsLog for current calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const userIds = users.map((u) => u.id);
    const pointsSums = userIds.length > 0
      ? await this.prisma.pointsLog.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds }, createdAt: { gte: monthStart, lte: monthEnd } },
          _sum: { points: true },
        })
      : [];
    const pointsMap = new Map(pointsSums.map((p) => [p.userId, p._sum.points ?? 0]));

    const activeThresholdMs = 24 * 60 * 60 * 1000; // 24 hours

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
        ...sanitizeUser(user),
        lastActiveAt,
        lastActiveMinutes,
        lastActiveSeconds,
        isActive,
        statistics: {
          totalPoints: pointsMap.get(user.id) ?? 0,
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
      ...sanitizeUser(user),
      lastActiveAt,
      lastActiveSeconds,
    };
  }

  /**
   * Update user name, email, and/or password
   */
  async updateUserDetails(
    userId: string,
    adminId: string,
    data: { firstName?: string; lastName?: string; email?: string; password?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: Record<string, any> = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      updateData.mustChangePassword = true;
    }

    if (Object.keys(updateData).length === 0) {
      return sanitizeUser(user);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: userId,
        changes: {
          fields: Object.keys(updateData).filter((k) => k !== 'passwordHash'),
          ...(data.password ? { passwordChanged: true } : {}),
        },
      },
    });

    // Email user their new password if one was set
    if (data.password) {
      this.emailService
        .sendPasswordResetEmail(updated.email, {
          firstName: updated.firstName,
          temporaryPassword: data.password,
        })
        .catch(() => null);
    }

    return sanitizeUser(updated);
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
      select: { id: true, email: true, firstName: true, lastName: true, role: true, cohortId: true },
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
   * Update user cohort assignment.
   *
   * Side-effects when the cohort actually changes:
   *   - Wipes all UserAchievement rows (per-cohort reset)
   *   - Resets currentMonthPoints to 0
   *   - Updates monthlyPointsCap based on the new cohort's duration
   */
  async updateUserCohort(userId: string, cohortId: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, cohortId: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let newMonthlyPointsCap: number | undefined;
    let cohort: { id: string; name: string; startDate: Date; endDate: Date } | null = null;

    if (cohortId) {
      cohort = await this.prisma.cohort.findUnique({
        where: { id: cohortId },
        select: { id: true, name: true, startDate: true, endDate: true },
      });

      if (!cohort) {
        throw new NotFoundException(`Cohort with ID ${cohortId} not found`);
      }

      const months = getCohortDurationMonths(cohort.startDate, cohort.endDate);
      newMonthlyPointsCap = getMonthlyCapForDuration(months);
    }

    // When the user moves to a different cohort (or is removed from one),
    // hard-delete their achievement records so they start fresh.
    const isChangingCohort = user.cohortId !== cohortId;
    if (isChangingCohort) {
      await this.prisma.userAchievement.deleteMany({ where: { userId } });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        cohortId,
        ...(newMonthlyPointsCap !== undefined
          ? { monthlyPointsCap: newMonthlyPointsCap }
          : {}),
        ...(isChangingCohort
          ? { currentMonthPoints: 0, lastPointReset: new Date() }
          : {}),
      },
      include: { cohort: true },
    });

    // Send welcome email when a fellow is assigned to a cohort for the first time or moved to a new one
    if (cohortId && cohort && isChangingCohort && user.role === UserRole.FELLOW) {
      this.emailService.sendWelcomeEmail(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        cohortName: cohort.name,
        startDate: cohort.startDate,
      }).catch(() => null);
    }

    return updated;
  }

  /**
   * Grant or revoke facilitator privilege (ADMIN users only)
   */
  async updateUserFacilitator(userId: string, isFacilitator: boolean, _adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);
    if (user.role !== 'ADMIN') {
      throw new BadRequestException('Facilitator privilege can only be granted to ADMIN users');
    }
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: { isFacilitator },
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

  async suspendUser(userId: string, adminId: string, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: true, suspendedAt: new Date(), suspensionReason: reason ?? null },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId, action: 'USER_SUSPENDED', entityType: 'User', entityId: userId,
        changes: { reason: reason ?? 'No reason provided' },
      },
    });

    try {
      await this.notificationsService.notifyUserSuspended(userId, reason);
    } catch {
      // Non-critical
    }

    return { message: 'User suspended', userId };
  }

  async unsuspendUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: false, suspendedAt: null, suspensionReason: null },
    });

    await this.prisma.adminAuditLog.create({
      data: { adminId, action: 'USER_UNSUSPENDED', entityType: 'User', entityId: userId, changes: {} },
    });

    try {
      await this.notificationsService.notifyUserUnsuspended(userId);
    } catch {
      // Non-critical
    }

    return { message: 'User unsuspended', userId };
  }

  async flagUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id: userId }, data: { isFlagged: true } });

    await this.prisma.adminAuditLog.create({
      data: { adminId, action: 'USER_FLAGGED', entityType: 'User', entityId: userId, changes: {} },
    });

    return { message: 'User flagged for review', userId };
  }

  async unflagUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id: userId }, data: { isFlagged: false } });

    await this.prisma.adminAuditLog.create({
      data: { adminId, action: 'USER_UNFLAGGED', entityType: 'User', entityId: userId, changes: {} },
    });

    return { message: 'User flag cleared', userId };
  }

  async resetUserPassword(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Generate a strong temporary password that meets PASSWORD_REGEX
    function generateStrongPassword(length = 12) {
      const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const lower = 'abcdefghijklmnopqrstuvwxyz';
      const digits = '0123456789';
      const special = '!@#$%^&*()_+-=[]{};:\"|,.<>/?';
      const all = upper + lower + digits + special;
      let password = '';
      // Ensure at least one of each requirement
      password += upper[Math.floor(Math.random() * upper.length)];
      password += lower[Math.floor(Math.random() * lower.length)];
      password += digits[Math.floor(Math.random() * digits.length)];
      password += special[Math.floor(Math.random() * special.length)];
      // Fill the rest
      for (let i = 4; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
      }
      // Shuffle password
      return password.split('').sort(() => 0.5 - Math.random()).join('');
    }
    const tempPassword = generateStrongPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword, mustChangePassword: true },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: userId,
        changes: { note: 'Password reset by admin' },
      },
    });

    // Email the user their new temporary password
    this.emailService
      .sendPasswordResetEmail(user.email, {
        firstName: user.firstName,
        temporaryPassword: tempPassword,
      })
      .catch(() => null);

    return {
      message: 'Password reset successfully',
      userId,
      temporaryPassword: tempPassword,
      note: 'A temporary password has been emailed to the user.',
    };
  }

  /**
   * Resend cohort welcome email to an existing fellow.
   * Useful when users were created/assigned before welcome sending existed.
   */
  async resendWelcomeEmail(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, cohortId: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.FELLOW) {
      throw new BadRequestException('Welcome email can only be sent to fellows');
    }
    if (!user.cohortId) {
      throw new BadRequestException('User is not assigned to a cohort');
    }

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: user.cohortId },
      select: { name: true, startDate: true },
    });
    if (!cohort) {
      throw new NotFoundException('Cohort not found');
    }

    const sent = await this.emailService.sendWelcomeEmail(user.email, {
      firstName: user.firstName,
      lastName: user.lastName,
      cohortName: cohort.name,
      startDate: cohort.startDate,
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'WELCOME_EMAIL_RESENT',
        entityType: 'User',
        entityId: userId,
        changes: { email: user.email, cohortId: user.cohortId, cohortName: cohort.name, sent },
      },
    });

    return { userId, sent };
  }

  async getFellowsMissingWelcomeEmail(cohortId?: string) {
    const fellows = await this.prisma.user.findMany({
      where: {
        role: UserRole.FELLOW,
        cohortId: cohortId ?? { not: null },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        cohortId: true,
        cohort: { select: { name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const ids = fellows.map((u) => u.id);
    if (ids.length === 0) return { users: [] };

    const logs = await this.prisma.adminAuditLog.findMany({
      where: {
        entityType: 'User',
        entityId: { in: ids },
        action: { in: ['WELCOME_EMAIL_SENT', 'WELCOME_EMAIL_RESENT'] },
      },
      select: { entityId: true },
    });
    const welcomed = new Set(logs.map((l) => l.entityId).filter(Boolean) as string[]);

    const missing = fellows.filter((u) => !welcomed.has(u.id));
    return { users: missing };
  }

  async bulkResendWelcomeEmail(userIds: string[], adminId: string) {
    const uniqueIds = Array.from(new Set((userIds || []).filter(Boolean)));
    if (uniqueIds.length === 0) {
      throw new BadRequestException('userIds is required');
    }

    const results: Array<{ userId: string; sent: boolean }> = [];
    for (const userId of uniqueIds) {
      // Sequential to avoid hammering SMTP provider
      const r = await this.resendWelcomeEmail(userId, adminId);
      results.push(r);
    }

    const sentCount = results.filter((r) => r.sent).length;
    return {
      requested: uniqueIds.length,
      sent: sentCount,
      failed: uniqueIds.length - sentCount,
      results,
    };
  }

  // ==================== GUEST FACILITATOR MANAGEMENT ====================

  /**
   * Create a guest facilitator account, optionally assigning sessions.
   * guestAccessExpiresAt = max(session.scheduledDate) + 8 days.
   * If no sessions provided, expiry stays null until sessions are assigned.
   */
  async createGuestFacilitator(
    adminId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      cohortId: string;
      sessionIds?: string[];
    },
  ) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: data.cohortId },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    let sessions: { id: string; title: string; scheduledDate: Date }[] = [];
    let guestAccessExpiresAt: Date | null = null;

    if (data.sessionIds && data.sessionIds.length > 0) {
      sessions = await this.prisma.session.findMany({
        where: { id: { in: data.sessionIds }, cohortId: data.cohortId },
        select: { id: true, title: true, scheduledDate: true },
      });
      if (sessions.length !== data.sessionIds.length) {
        throw new BadRequestException(
          'All sessions must belong to the specified cohort',
        );
      }

      const latestDate = sessions.reduce(
        (max, s) => (s.scheduledDate > max ? s.scheduledDate : max),
        sessions[0].scheduledDate,
      );
      guestAccessExpiresAt = new Date(latestDate);
      guestAccessExpiresAt.setDate(guestAccessExpiresAt.getDate() + 8);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        passwordHash: hashedPassword,
        role: UserRole.GUEST_FACILITATOR,
        cohortId: data.cohortId,
        guestAccessExpiresAt,
        mustChangePassword: true,
        ...(sessions.length > 0 && {
          guestSessions: {
            create: sessions.map((s) => ({ sessionId: s.id })),
          },
        }),
      },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'CREATE_GUEST_FACILITATOR',
        entityType: 'User',
        entityId: user.id,
        changes: {
          cohortId: data.cohortId,
          sessionIds: sessions.map((s) => s.id),
          guestAccessExpiresAt: guestAccessExpiresAt?.toISOString() ?? null,
        },
      },
    });

    // Send welcome email if sessions were assigned
    if (sessions.length > 0 && guestAccessExpiresAt) {
      const now = new Date();
      const firstSession = sessions.sort(
        (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
      )[0];
      const daysUntilSession = Math.ceil(
        (firstSession.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysUntilLock = Math.ceil(
        (guestAccessExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      this.emailService
        .sendGuestFacilitatorWelcomeEmail(user.email, {
          firstName: user.firstName,
          email: user.email,
          password: data.password,
          cohortName: cohort.name,
          sessions,
          daysUntilSession,
          guestAccessExpiresAt,
          daysUntilLock,
        })
        .catch(() => null);
    }

    return sanitizeUser(user);
  }

  /**
   * Update session assignments for a guest facilitator.
   * Recomputes guestAccessExpiresAt from the new max session date.
   * Sends welcome email if this is the first time sessions are being assigned.
   */
  async updateGuestFacilitatorSessions(
    userId: string,
    sessionIds: string[],
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, cohortId: true, email: true, firstName: true, lastName: true, guestAccessExpiresAt: true },
    });
    if (!user || user.role !== UserRole.GUEST_FACILITATOR) {
      throw new BadRequestException('User is not a guest facilitator');
    }
    if (!user.cohortId) {
      throw new BadRequestException('Guest facilitator has no cohort assigned');
    }

    const sessions = await this.prisma.session.findMany({
      where: { id: { in: sessionIds }, cohortId: user.cohortId },
      select: { id: true, title: true, scheduledDate: true },
    });
    if (sessions.length !== sessionIds.length) {
      throw new BadRequestException(
        "All sessions must belong to the guest facilitator's cohort",
      );
    }

    const latestDate = sessions.reduce(
      (max, s) => (s.scheduledDate > max ? s.scheduledDate : max),
      sessions[0].scheduledDate,
    );
    const guestAccessExpiresAt = new Date(latestDate);
    guestAccessExpiresAt.setDate(guestAccessExpiresAt.getDate() + 8);

    const wasFirstAssignment = !user.guestAccessExpiresAt;

    await this.prisma.$transaction([
      this.prisma.guestSession.deleteMany({ where: { userId } }),
      this.prisma.guestSession.createMany({
        data: sessions.map((s) => ({ userId, sessionId: s.id })),
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { guestAccessExpiresAt },
      }),
    ]);

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'UPDATE_GUEST_SESSIONS',
        entityType: 'User',
        entityId: userId,
        changes: {
          sessionIds,
          guestAccessExpiresAt: guestAccessExpiresAt.toISOString(),
        },
      },
    });

    // Send welcome email if this is the first time sessions are assigned
    if (wasFirstAssignment) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: user.cohortId },
        select: { name: true },
      });
      const now = new Date();
      const firstSession = [...sessions].sort(
        (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
      )[0];
      const daysUntilSession = Math.ceil(
        (firstSession.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysUntilLock = Math.ceil(
        (guestAccessExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      this.emailService
        .sendGuestFacilitatorWelcomeEmail(user.email, {
          firstName: user.firstName,
          email: user.email,
          password: '(use your current password)',
          cohortName: cohort?.name ?? '',
          sessions,
          daysUntilSession,
          guestAccessExpiresAt,
          daysUntilLock,
        })
        .catch(() => null);
    }

    return { message: 'Guest facilitator sessions updated', guestAccessExpiresAt };
  }

  /**
   * Extend or reset the access window for a guest facilitator (admin unlock).
   */
  async extendGuestAccess(
    userId: string,
    newExpiresAt: Date,
    adminId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== UserRole.GUEST_FACILITATOR) {
      throw new BadRequestException('User is not a guest facilitator');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { guestAccessExpiresAt: newExpiresAt },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'EXTEND_GUEST_ACCESS',
        entityType: 'User',
        entityId: userId,
        changes: { guestAccessExpiresAt: newExpiresAt.toISOString() },
      },
    });

    return sanitizeUser(updated);
  }
}
