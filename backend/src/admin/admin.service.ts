import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  BadGatewayException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventType, ResourceState, UserRole } from '@prisma/client';
import {
  CreateCohortDto,
  UpdateCohortDto,
  UpdateSessionDto,
  CreateSessionDto,
  BulkMarkAttendanceDto,
  AiReviewDto,
  AiChatDto,
  CreateQuizDto,
  GenerateAIQuestionsDto,
} from './dto/admin.dto';
import { SessionAnalyticsService } from '../session-analytics/session-analytics.service';
import {
  CreateResourceDto,
  UpdateResourceDto,
} from '../resources/dto/create-resource.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';
import { PointsService } from '../gamification/points.service';
import { QuizUnlockNotificationService } from '../quizzes/quiz-unlock-notification.service';
import { normalizeQuizAnswer } from '../common/quiz-answer';
import { resolveStoredAnswerForQuestion } from '../common/quiz-stored-answers';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private sessionAnalyticsService: SessionAnalyticsService,
    private pointsService: PointsService,
    private quizUnlockNotificationService: QuizUnlockNotificationService,
  ) {}

  // ============ Cohort Management Methods ============

  async getAllCohorts() {
    const cohorts = await (this.prisma as any).cohort.findMany({
      include: {
        _count: {
          select: { sessions: true },
        },
        facilitators: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                isFacilitator: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    if (cohorts.length === 0) return cohorts;

    // Compute accurate fellow count per cohort via groupBy
    const cohortIds = cohorts.map((c) => c.id);
    const fellowCounts = await this.prisma.user.groupBy({
      by: ['cohortId'],
      where: { cohortId: { in: cohortIds }, role: 'FELLOW' },
      _count: { id: true },
    });
    const countMap: Record<string, number> = Object.fromEntries(
      fellowCounts.map((c) => [c.cohortId, c._count.id]),
    );

    return cohorts.map((cohort) => ({
      ...cohort,
      _count: { ...cohort._count, fellows: countMap[cohort.id] ?? 0 },
    }));
  }

  async getCohortMembers(cohortId: string, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, cohortId: true },
    });
    if (!requester) {
      throw new ForbiddenException('Not authenticated');
    }
    if (requester.role === 'FELLOW' && requester.cohortId !== cohortId) {
      throw new ForbiddenException('You can only view your own cohort members');
    }
    if (requester.role === 'FACILITATOR' && requester.cohortId !== cohortId) {
      throw new ForbiddenException(
        'You can only view members of your assigned cohort',
      );
    }

    const members = await this.prisma.user.findMany({
      where: { cohortId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isSuspended: true,
        cohortLeadershipRole: true,
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });

    // Compute live points from pointsLog for the current calendar month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const pointsSums = await this.prisma.pointsLog.groupBy({
      by: ['userId'],
      where: {
        userId: { in: members.map((m) => m.id) },
        createdAt: { gte: monthStart, lte: monthEnd },
      },
      _sum: { points: true },
    });
    const pointsMap = new Map(
      pointsSums.map((p) => [p.userId, p._sum.points ?? 0]),
    );

    return members.map((m) => ({
      ...m,
      currentMonthPoints: pointsMap.get(m.id) ?? 0,
    }));
  }

  async createCohort(dto: CreateCohortDto, adminId: string) {
    const cohort = await this.prisma.cohort.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        state: 'ACTIVE',
        timeZone: dto.timeZone?.trim() || 'UTC',
      },
    });

    // Auto-create default chat channel for this cohort
    await this.chatService.createChannel(
      {
        cohortId: cohort.id,
        name: `${cohort.name} - General Chat`,
        description: `Main chat room for ${cohort.name} cohort`,
        type: 'COHORT_WIDE',
      },
      adminId,
    );

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'CREATE_COHORT',
        entityType: 'Cohort',
        entityId: cohort.id,
        changes: { created: cohort },
      },
    });

    // Notify all admins
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });
    await this.notificationsService.notifyAdminsCohortUpdated(
      cohort.id,
      `${admin?.firstName} ${admin?.lastName}`,
      'created',
      'COHORT_CREATED',
    );

    return cohort;
  }

  async updateCohort(cohortId: string, dto: UpdateCohortDto, adminId: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
    });

    if (!cohort) {
      throw new NotFoundException('Cohort not found');
    }

    // Exclude facilitatorId from the DTO since facilitators are managed via CohortFacilitator
    const { facilitatorId: _ignored, ...updateData } = dto as any;
    if (updateData.startDate)
      updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    const updatedCohort = await this.prisma.cohort.update({
      where: { id: cohortId },
      data: updateData,
    });

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'UPDATE_COHORT',
        entityType: 'Cohort',
        entityId: cohortId,
        changes: { before: cohort, after: updatedCohort },
      },
    });

    // Notify all admins
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });
    const changes = Object.keys(dto).join(', ');
    await this.notificationsService.notifyAdminsCohortUpdated(
      cohortId,
      `${admin?.firstName} ${admin?.lastName}`,
      `updated ${changes}`,
      'COHORT_UPDATED',
    );

    return updatedCohort;
  }

  async addCohortFacilitator(cohortId: string, userId: string) {
    const [cohort, user] = await Promise.all([
      this.prisma.cohort.findUnique({ where: { id: cohortId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!cohort) throw new NotFoundException('Cohort not found');
    if (!user) throw new NotFoundException('User not found');

    const u = user as any;
    if (u.role !== 'FACILITATOR' && !(u.role === 'ADMIN' && u.isFacilitator)) {
      throw new BadRequestException(
        'User must be a FACILITATOR or an Admin with facilitator privilege',
      );
    }

    return (this.prisma as any).cohortFacilitator.upsert({
      where: { cohortId_userId: { cohortId, userId } },
      create: { cohortId, userId },
      update: {},
    });
  }

  async removeCohortFacilitator(cohortId: string, userId: string) {
    const record = await (this.prisma as any).cohortFacilitator.findUnique({
      where: { cohortId_userId: { cohortId, userId } },
    });

    if (!record)
      throw new NotFoundException('Facilitator assignment not found');

    return (this.prisma as any).cohortFacilitator.delete({
      where: { cohortId_userId: { cohortId, userId } },
    });
  }

  async deleteCohort(cohortId: string, adminId: string) {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        fellows: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!cohort) {
      throw new NotFoundException('Cohort not found');
    }

    // Delete all users in the cohort first
    await this.prisma.user.deleteMany({
      where: { cohortId },
    });

    // Delete the cohort
    await this.prisma.cohort.delete({
      where: { id: cohortId },
    });

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'DELETE_COHORT',
        entityType: 'Cohort',
        entityId: cohortId,
        changes: {
          deleted: {
            cohort: cohort.name,
            usersDeleted: cohort.fellows.length,
            users: cohort.fellows.map((u) => ({
              email: u.email,
              name: `${u.firstName} ${u.lastName}`,
            })),
          },
        },
      },
    });

    return {
      message: 'Cohort and all users deleted successfully',
      deletedCohort: cohort.name,
      deletedUsersCount: cohort.fellows.length,
    };
  }

  async updateSession(
    sessionId: string,
    dto: UpdateSessionDto,
    adminId: string,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, cohortId: true },
    });
    if (
      requester?.role === 'FACILITATOR' &&
      requester.cohortId !== session.cohortId
    ) {
      throw new ForbiddenException(
        'Facilitators can only edit sessions in their own cohort',
      );
    }

    // Auto-calculate unlock date if scheduledDate provided but unlockDate not
    const updateData: any = { ...dto };
    if (dto.scheduledDate && !dto.unlockDate) {
      const scheduledDate = new Date(dto.scheduledDate);
      const unlockDate = new Date(scheduledDate);
      unlockDate.setDate(unlockDate.getDate() - 5); // 5 days before session date
      updateData.unlockDate = unlockDate.toISOString();
    }

    const updatedSession = await this.prisma.session.update({
      where: { id: sessionId },
      data: updateData,
    });

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'UPDATE_SESSION',
        entityType: 'Session',
        entityId: sessionId,
        changes: { before: session, after: updatedSession },
      },
    });

    // Notify all admins
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { firstName: true, lastName: true },
    });
    await this.notificationsService.notifyAdminsSessionUpdated(
      sessionId,
      `${admin?.firstName} ${admin?.lastName}`,
      'updated',
      'SESSION_UPDATED',
    );

    return updatedSession;
  }

  async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminAuditLog.count(),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPlatformMetrics() {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const [
      totalUsers,
      activeFellows,
      resourceCount,
      cohortCount,
      fellowCount,
      facilitatorCount,
      adminCount,
      newUsersThisWeek,
      newUsersLastWeek,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          role: 'FELLOW',
          OR: [
            { lastLoginAt: { gte: sevenDaysAgo } },
            {
              resourceProgress: { some: { updatedAt: { gte: sevenDaysAgo } } },
            },
            { discussions: { some: { createdAt: { gte: sevenDaysAgo } } } },
            { quizResponses: { some: { completedAt: { gte: sevenDaysAgo } } } },
          ],
        },
      }),
      this.prisma.resource.count(),
      this.prisma.cohort.count(),
      this.prisma.user.count({ where: { role: 'FELLOW' } }),
      this.prisma.user.count({ where: { role: 'FACILITATOR' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo }, role: 'FELLOW' },
      }),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: fourteenDaysAgo,
            lt: sevenDaysAgo,
          },
          role: 'FELLOW',
        },
      }),
    ]);

    const weeklyGrowth =
      newUsersLastWeek === 0
        ? newUsersThisWeek > 0
          ? 100
          : 0
        : Math.round(
            ((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100,
          );
    const engagementRate =
      fellowCount === 0 ? 0 : Math.round((activeFellows / fellowCount) * 100);

    return {
      totalUsers,
      activeUsers: activeFellows,
      engagementRate,
      weeklyGrowth,
      resourceCount,
      cohortCount,
      roleCounts: {
        fellowCount,
        facilitatorCount,
        adminCount,
      },
      newUsersThisWeek,
      newUsersLastWeek,
    };
  }

  // ============ Resource Management ============

  async createResource(dto: CreateResourceDto, adminId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, cohortId: true, firstName: true, lastName: true },
    });

    if (!requester) {
      throw new NotFoundException('User not found');
    }

    // Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (
      requester.role === 'FACILITATOR' &&
      requester.cohortId !== session.cohortId
    ) {
      throw new BadRequestException(
        'Facilitators can only manage resources in their cohort',
      );
    }

    // Create the resource
    const resource = await this.prisma.resource.create({
      data: {
        sessionId: dto.sessionId,
        type: dto.type as any,
        title: dto.title,
        description: dto.description,
        url: dto.url,
        duration: dto.duration,
        estimatedMinutes: dto.estimatedMinutes || 10,
        isCore: dto.isCore !== undefined ? dto.isCore : true,
        pointValue: dto.pointValue ?? (dto.isCore === false ? 50 : 100),
        order: dto.order,
      },
      include: {
        session: true,
      },
    });

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'CREATE_RESOURCE',
        entityType: 'Resource',
        entityId: resource.id,
        changes: { created: resource },
      },
    });

    try {
      await this.notificationsService.notifyAdminsResourceUpdated(
        resource.id,
        `${requester?.firstName} ${requester?.lastName}`,
        'created',
        'RESOURCE_CREATED',
      );
    } catch {
      // Non-critical
    }

    return resource;
  }

  async updateResource(
    resourceId: string,
    dto: UpdateResourceDto,
    adminId: string,
  ) {
    const requester = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, cohortId: true, firstName: true, lastName: true },
    });

    if (!requester) {
      throw new NotFoundException('User not found');
    }

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (requester.role === 'FACILITATOR') {
      const existingSession = await this.prisma.session.findUnique({
        where: { id: resource.sessionId },
        select: { cohortId: true },
      });

      if (!existingSession || existingSession.cohortId !== requester.cohortId) {
        throw new BadRequestException(
          'Facilitators can only manage resources in their cohort',
        );
      }
    }

    // If sessionId is being changed, verify it exists
    if (dto.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: dto.sessionId },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (
        requester.role === 'FACILITATOR' &&
        session.cohortId !== requester.cohortId
      ) {
        throw new BadRequestException(
          'Facilitators can only move resources within their cohort',
        );
      }
    }

    // Auto-set pointValue based on isCore: core=100, optional=50
    let effectivePointValue = dto.pointValue;
    if (dto.isCore !== undefined && effectivePointValue === undefined) {
      effectivePointValue = dto.isCore ? 100 : 50;
    }

    const updatedResource = await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        ...(dto.sessionId && { sessionId: dto.sessionId }),
        ...(dto.type && { type: dto.type as any }),
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.url && { url: dto.url }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.estimatedMinutes && { estimatedMinutes: dto.estimatedMinutes }),
        ...(dto.isCore !== undefined && { isCore: dto.isCore }),
        ...(effectivePointValue !== undefined && {
          pointValue: effectivePointValue,
        }),
        ...(dto.order && { order: dto.order }),
        ...(dto.state && { state: dto.state }),
      },
      include: {
        session: true,
      },
    });

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'UPDATE_RESOURCE',
        entityType: 'Resource',
        entityId: resourceId,
        changes: { before: resource, after: updatedResource },
      },
    });

    try {
      await this.notificationsService.notifyAdminsResourceUpdated(
        resourceId,
        `${requester?.firstName} ${requester?.lastName}`,
        'updated',
        'RESOURCE_UPDATED',
      );
    } catch {
      // Non-critical — don't fail the update if notification fails
    }

    return updatedResource;
  }

  async toggleResourceLock(
    resourceId: string,
    state: string,
    requesterId: string,
  ) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { session: { select: { cohortId: true } } },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    if (requesterId) {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { role: true, cohortId: true },
      });
      if (requester?.role === 'FACILITATOR') {
        if (
          !resource.session ||
          resource.session.cohortId !== requester.cohortId
        ) {
          throw new ForbiddenException(
            'Facilitators can only manage resources in their cohort',
          );
        }
      }
    }

    const updated = await this.prisma.resource.update({
      where: { id: resourceId },
      data: { state: state as ResourceState },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            scheduledDate: true,
            unlockDate: true,
          },
        },
      },
    });

    // When locking: clear all non-COMPLETED per-user progress so the resource
    // correctly shows as locked even for fellows who had started it.
    // COMPLETED progress is preserved — completed work cannot be undone.
    // Points are NOT revoked (in-progress fellows never earned any; completed
    // fellows did the actual work and keep their points).
    if (state === 'LOCKED') {
      await this.prisma.resourceProgress.deleteMany({
        where: {
          resourceId,
          state: { not: 'COMPLETED' },
        },
      });
    }

    // Notify all fellows in the cohort when a resource is manually unlocked
    if (state === 'UNLOCKED' && resource.session?.cohortId) {
      try {
        await this.notificationsService.notifyFellowsResourceUnlocked(
          resourceId,
          resource.session.cohortId,
          resource.title,
          updated.session.title,
        );
      } catch {
        // Non-critical — don't fail if notifications error
      }
    }

    return updated;
  }

  async deleteResource(resourceId: string, adminId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, cohortId: true, firstName: true, lastName: true },
    });

    if (!requester) {
      throw new NotFoundException('User not found');
    }

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        progress: true,
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (requester.role === 'FACILITATOR') {
      const session = await this.prisma.session.findUnique({
        where: { id: resource.sessionId },
        select: { cohortId: true },
      });

      if (!session || session.cohortId !== requester.cohortId) {
        throw new BadRequestException(
          'Facilitators can only manage resources in their cohort',
        );
      }
    }

    // Check if any users have started this resource
    if (resource.progress && resource.progress.length > 0) {
      throw new BadRequestException(
        `Cannot delete resource: ${resource.progress.length} user(s) have already started this resource`,
      );
    }

    await this.prisma.resource.delete({
      where: { id: resourceId },
    });

    // Log admin action
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'DELETE_RESOURCE',
        entityType: 'Resource',
        entityId: resourceId,
        changes: { deleted: resource },
      },
    });

    try {
      await this.notificationsService.notifyAdminsResourceUpdated(
        resourceId,
        `${requester?.firstName} ${requester?.lastName}`,
        'deleted',
        'RESOURCE_UPDATED',
      );
    } catch {
      // Non-critical
    }

    return { success: true, message: 'Resource deleted successfully' };
  }

  async getResourcesBySession(sessionId: string, requesterId?: string) {
    if (requesterId) {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { role: true, cohortId: true },
      });

      if (requester?.role === 'FACILITATOR') {
        const session = await this.prisma.session.findUnique({
          where: { id: sessionId },
          select: { cohortId: true },
        });

        if (!session || session.cohortId !== requester.cohortId) {
          throw new BadRequestException(
            'Facilitators can only view resources in their cohort',
          );
        }
      }
    }

    return this.prisma.resource.findMany({
      where: { sessionId },
      orderBy: { order: 'asc' },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            sessionNumber: true,
            scheduledDate: true,
            unlockDate: true,
          },
        },
      },
    });
  }

  // ============ Session Management Methods ============

  async createSession(dto: CreateSessionDto, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, cohortId: true, firstName: true, lastName: true },
    });
    if (!requester) throw new NotFoundException('User not found');

    if (
      requester.role === 'FACILITATOR' &&
      requester.cohortId !== dto.cohortId
    ) {
      throw new ForbiddenException(
        'Facilitators can only create sessions for their own cohort',
      );
    }

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: dto.cohortId },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    const scheduledDate = new Date(dto.scheduledDate);
    let unlockDate: Date;
    if (dto.unlockDate) {
      unlockDate = new Date(dto.unlockDate);
    } else {
      unlockDate = new Date(scheduledDate);
      unlockDate.setDate(unlockDate.getDate() - 5);
    }

    const session = await this.prisma.session.create({
      data: {
        cohortId: dto.cohortId,
        sessionNumber: dto.sessionNumber,
        title: dto.title,
        description: dto.description,
        monthTheme: dto.monthTheme,
        scheduledDate,
        unlockDate,
      },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId: requesterId,
        action: 'CREATE_SESSION',
        entityType: 'Session',
        entityId: session.id,
        changes: { created: session },
      },
    });

    try {
      await this.notificationsService.notifyAdminsSessionUpdated(
        session.id,
        `${requester.firstName} ${requester.lastName}`,
        'created',
        'SESSION_CREATED',
      );
    } catch {
      // non-critical
    }

    return session;
  }

  async getSessionAttendance(sessionId: string, requesterId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { cohort: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, cohortId: true },
    });
    if (!requester) throw new NotFoundException('User not found');

    if (
      requester.role === 'FACILITATOR' &&
      requester.cohortId !== session.cohortId
    ) {
      throw new ForbiddenException(
        'Facilitators can only view attendance for their own cohort',
      );
    }

    const [fellows, attendances] = await Promise.all([
      this.prisma.user.findMany({
        where: { cohortId: session.cohortId, role: 'FELLOW' },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.attendance.findMany({
        where: { sessionId },
        select: {
          userId: true,
          isLate: true,
          isExcused: true,
          notes: true,
          checkInTime: true,
        },
      }),
    ]);

    const attendanceMap = new Map(attendances.map((a) => [a.userId, a]));

    return {
      session: {
        id: session.id,
        title: session.title,
        sessionNumber: session.sessionNumber,
        scheduledDate: session.scheduledDate,
        cohortName: session.cohort.name,
      },
      fellows: fellows.map((f) => {
        const record = attendanceMap.get(f.id);
        return {
          ...f,
          isPresent: !!record,
          isLate: record?.isLate ?? false,
          isExcused: record?.isExcused ?? false,
          notes: record?.notes ?? null,
          checkInTime: record?.checkInTime ?? null,
        };
      }),
    };
  }

  async markBulkAttendance(
    sessionId: string,
    dto: BulkMarkAttendanceDto,
    requesterId: string,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { cohort: { select: { name: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, cohortId: true, firstName: true, lastName: true },
    });
    if (!requester) throw new NotFoundException('User not found');

    if (
      requester.role === 'FACILITATOR' &&
      requester.cohortId !== session.cohortId
    ) {
      throw new ForbiddenException(
        'Facilitators can only mark attendance for their own cohort',
      );
    }

    const results = await Promise.all(
      dto.attendances.map(async (record) => {
        if (record.isPresent) {
          return this.prisma.attendance.upsert({
            where: { userId_sessionId: { userId: record.fellowId, sessionId } },
            create: {
              userId: record.fellowId,
              sessionId,
              isLate: record.isLate ?? false,
              isExcused: record.isExcused ?? false,
              notes: record.notes,
              checkInTime: new Date(),
            },
            update: {
              isLate: record.isLate ?? false,
              isExcused: record.isExcused ?? false,
              notes: record.notes,
            },
          });
        } else {
          // Remove attendance record if marked absent
          await this.prisma.attendance.deleteMany({
            where: { userId: record.fellowId, sessionId },
          });
          return null;
        }
      }),
    );

    // Send attendance notifications to each fellow
    await Promise.allSettled(
      dto.attendances.map((record) =>
        this.notificationsService.notifyAttendanceMarked(
          record.fellowId,
          session.title,
          sessionId,
          record.isPresent,
          record.isLate ?? false,
        ),
      ),
    );

    return {
      message: 'Attendance recorded successfully',
      marked: dto.attendances.length,
      present: dto.attendances.filter((r) => r.isPresent).length,
      absent: dto.attendances.filter((r) => !r.isPresent).length,
      records: results.filter(Boolean),
    };
  }

  async submitAiReview(
    sessionId: string,
    dto: AiReviewDto,
    requesterId: string,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    return this.sessionAnalyticsService.processSessionAnalytics(
      sessionId,
      dto.transcript,
      requesterId,
    );
  }

  async getAiHealth() {
    return this.sessionAnalyticsService.getAiProviderHealth();
  }

  async aiChat(sessionId: string, dto: AiChatDto, requesterId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { cohort: { select: { name: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');

    return this.sessionAnalyticsService.chatAboutSession(
      sessionId,
      requesterId,
      dto.message,
      dto.transcript,
      dto.history ?? [],
    );
  }

  async deleteSessionAnalytics(sessionId: string, requesterId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, cohortId: true },
    });
    if (!requester) throw new NotFoundException('User not found');

    if (
      requester.role === 'FACILITATOR' &&
      requester.cohortId !== session.cohortId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return this.sessionAnalyticsService.deleteSessionAnalytics(sessionId);
  }

  async getAllResources(filters?: {
    sessionId?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
    requesterId?: string;
    cohortId?: string;
  }) {
    const { sessionId, type, search, requesterId, cohortId } = filters || {};
    // Ensure page and limit are numbers
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (type) where.type = type;
    if (cohortId) where.session = { cohortId };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (requesterId && !cohortId) {
      const requester = await this.prisma.user.findUnique({
        where: { id: requesterId },
        select: { role: true, cohortId: true },
      });

      if (requester?.role === 'FACILITATOR' && requester.cohortId) {
        where.session = { cohortId: requester.cohortId };
      }
    }

    const [resources, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sessionId: 'asc' }, { order: 'asc' }],
        include: {
          session: {
            select: {
              id: true,
              title: true,
              sessionNumber: true,
              scheduledDate: true,
              unlockDate: true,
            },
          },
        },
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      data: resources,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============ Quiz Management Methods ============

  async getCohortQuizzes(cohortId: string) {
    const commonInclude = {
      questions: { orderBy: { order: 'asc' } },
      _count: { select: { questions: true, responses: true } },
    };

    // Session-linked quizzes (SESSION type — linked via junction table)
    const sessionQuizzes = await this.prisma.quiz.findMany({
      where: {
        quizType: 'SESSION',
        sessions: { some: { session: { cohortId } } },
      } as any,
      include: {
        sessions: {
          include: {
            session: { select: { id: true, title: true, sessionNumber: true } },
          },
        },
        ...commonInclude,
      } as any,
      orderBy: { createdAt: 'desc' },
    });

    // Direct cohort quizzes (GENERAL / MEGA — no session link)
    const cohortQuizzes = await this.prisma.quiz.findMany({
      where: { cohortId, quizType: { in: ['GENERAL', 'MEGA'] } } as any,
      include: { ...commonInclude } as any,
      orderBy: { createdAt: 'desc' },
    });

    return { sessionQuizzes, cohortQuizzes };
  }

  private async assertStaffCohortAccess(cohortId: string, requesterId: string) {
    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, cohortId: true },
    });
    if (!requester) throw new ForbiddenException('Not authenticated');
    if (requester.role === 'ADMIN') return;
    const assignment = await this.prisma.cohortFacilitator.findFirst({
      where: { cohortId, userId: requesterId },
    });
    if (assignment) return;
    // Legacy: some facilitators are scoped only via user.cohortId (matches getCohortMembers).
    if (
      requester.role === 'FACILITATOR' &&
      requester.cohortId === cohortId
    ) {
      return;
    }
    throw new ForbiddenException('You are not assigned to this cohort');
  }

  private async assertQuizInCohortOrThrow(
    quizId: string,
    cohortId: string,
  ): Promise<{ id: string; title: string }> {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        OR: [
          { cohortId },
          { sessions: { some: { session: { cohortId } } } },
        ],
      },
      select: { id: true, title: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found for this cohort');
    return quiz;
  }

  /** Fellows' attempts for a quiz — admin / cohort facilitators. */
  async getQuizAttemptsForStaff(
    quizId: string,
    cohortId: string,
    requesterId: string,
  ) {
    await this.assertStaffCohortAccess(cohortId, requesterId);
    await this.assertQuizInCohortOrThrow(quizId, cohortId);

    const responses = await this.prisma.quizResponse.findMany({
      where: { quizId },
      orderBy: { completedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            cohortId: true,
          },
        },
      },
    });

    const attempts = responses
      .filter((r) => r.user.cohortId === cohortId)
      .map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: `${r.user.firstName} ${r.user.lastName}`.trim(),
        email: r.user.email,
        score: r.score,
        passed: r.passed,
        pointsAwarded: r.pointsAwarded,
        completedAt: r.completedAt,
        timeTaken: r.timeTaken,
      }));

    const fellowIds = await this.prisma.user
      .findMany({
        where: { cohortId, role: 'FELLOW' },
        select: { id: true },
      })
      .then((rows) => rows.map((u) => u.id));

    const passTimesByUser = new Map<string, Date[]>();
    for (const r of responses) {
      if (r.user.cohortId !== cohortId || !r.passed) continue;
      if (!passTimesByUser.has(r.userId)) passTimesByUser.set(r.userId, []);
      passTimesByUser.get(r.userId)!.push(r.completedAt);
    }

    const quizSubmitLogs = await this.prisma.pointsLog.findMany({
      where: {
        quizId,
        userId: { in: fellowIds },
        eventType: EventType.QUIZ_SUBMIT,
      },
      select: { userId: true, points: true, description: true, createdAt: true },
    });

    const achievementLogs = await this.prisma.pointsLog.findMany({
      where: {
        userId: { in: fellowIds },
        eventType: EventType.ADMIN_ADJUSTMENT,
        description: { startsWith: 'Achievement unlocked:' },
      },
      select: { userId: true, points: true, description: true, createdAt: true },
    });

    const parseAchievementName = (description: string) => {
      const m = /^Achievement unlocked:\s*(.+)$/i.exec(description.trim());
      return m ? m[1].trim() : description;
    };

    const logMatchesPassWindow = (logAt: Date, passTimes: Date[]) => {
      const tLog = logAt.getTime();
      return passTimes.some((t) => {
        const t0 = t.getTime();
        return tLog >= t0 - 3000 && tLog <= t0 + 120000;
      });
    };

    const quizPointsByUser = new Map<string, number>();
    for (const row of quizSubmitLogs) {
      quizPointsByUser.set(
        row.userId,
        (quizPointsByUser.get(row.userId) ?? 0) + row.points,
      );
    }

    type AchBonus = { name: string; points: number; unlockedAt: string };
    const achievementBonusesByUser = new Map<string, AchBonus[]>();
    for (const row of achievementLogs) {
      const passTimes = passTimesByUser.get(row.userId) ?? [];
      if (passTimes.length === 0 || !logMatchesPassWindow(row.createdAt, passTimes)) {
        continue;
      }
      const bonus: AchBonus = {
        name: parseAchievementName(row.description),
        points: row.points,
        unlockedAt: row.createdAt.toISOString(),
      };
      if (!achievementBonusesByUser.has(row.userId)) {
        achievementBonusesByUser.set(row.userId, []);
      }
      achievementBonusesByUser.get(row.userId)!.push(bonus);
    }
    for (const [, arr] of achievementBonusesByUser) {
      arr.sort(
        (a, b) =>
          new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime(),
      );
    }

    const leaderboardPointsTotalByUser: Record<string, number> = {};
    for (const uid of fellowIds) {
      const qPts = quizPointsByUser.get(uid) ?? 0;
      const aPts =
        achievementBonusesByUser.get(uid)?.reduce((s, x) => s + x.points, 0) ??
        0;
      leaderboardPointsTotalByUser[uid] = qPts + aPts;
    }

    const byUser = new Map<string, typeof attempts>();
    for (const a of attempts) {
      if (!byUser.has(a.userId)) byUser.set(a.userId, []);
      byUser.get(a.userId)!.push(a);
    }

    const fellowSummaries = [...byUser.entries()].map(([userId, rows]) => {
      const sorted = [...rows].sort(
        (a, b) =>
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );
      const bestScore = Math.max(...rows.map((r) => r.score));
      const passedOnce = rows.some((r) => r.passed);
      const qPts = quizPointsByUser.get(userId) ?? 0;
      const ach = achievementBonusesByUser.get(userId) ?? [];
      const achPts = ach.reduce((s, x) => s + x.points, 0);
      return {
        userId,
        userName: sorted[0].userName,
        email: sorted[0].email,
        attemptCount: rows.length,
        bestScore,
        passedOnce,
        lastCompletedAt: sorted[0].completedAt,
        /** Points from QUIZ_SUBMIT rows tied to this quiz (base pass + time bonus, etc.). */
        quizPointsFromLog: qPts,
        /** Achievement bonus points logged right after a passing attempt on this quiz. */
        achievementBonuses: ach,
        /** Quiz submit points + achievement bonuses (leaderboard activity from this quiz session). */
        leaderboardPointsTotal: qPts + achPts,
      };
    });
    fellowSummaries.sort(
      (a, b) =>
        new Date(b.lastCompletedAt).getTime() -
        new Date(a.lastCompletedAt).getTime(),
    );

    return {
      attempts,
      fellowSummaries,
      pointsFromQuizByUser: leaderboardPointsTotalByUser,
    };
  }

  /** Per-question right/wrong for one attempt — admin / cohort facilitators. */
  async getQuizAttemptDetailForStaff(
    quizId: string,
    cohortId: string,
    responseId: string,
    requesterId: string,
  ) {
    await this.assertStaffCohortAccess(cohortId, requesterId);
    const quiz = await this.assertQuizInCohortOrThrow(quizId, cohortId);

    const response = await this.prisma.quizResponse.findFirst({
      where: { id: responseId, quizId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            cohortId: true,
          },
        },
      },
    });
    if (!response) throw new NotFoundException('Attempt not found');
    if (response.user.cohortId !== cohortId) {
      throw new ForbiddenException('This attempt is not in your cohort');
    }

    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { order: 'asc' },
    });

    const userAnswers = (response.answers as Record<string, string>) || {};

    const questionsOut = questions.map((q, i) => {
      const rawUser = resolveStoredAnswerForQuestion(
        questions,
        i,
        q.id,
        userAnswers,
      );
      const isCorrect =
        normalizeQuizAnswer(rawUser) === normalizeQuizAnswer(q.correctAnswer);
      return {
        id: q.id,
        order: q.order,
        question: q.question,
        options: q.options,
        userAnswer: rawUser ?? null,
        correctAnswer: q.correctAnswer,
        isCorrect,
      };
    });

    return {
      quizTitle: quiz.title,
      response: {
        id: response.id,
        score: response.score,
        passed: response.passed,
        pointsAwarded: response.pointsAwarded,
        completedAt: response.completedAt,
        timeTaken: response.timeTaken,
        timeBonus: response.timeBonus,
      },
      user: {
        id: response.user.id,
        name: `${response.user.firstName} ${response.user.lastName}`.trim(),
        email: response.user.email,
      },
      questions: questionsOut,
    };
  }

  async createQuiz(dto: CreateQuizDto) {
    const quiz = await this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description,
        cohortId: dto.cohortId,
        quizType: dto.quizType,
        timeLimit: dto.timeLimit,
        passingScore: dto.passingScore,
        pointValue: dto.pointValue,
        maxAttempts: dto.maxAttempts ?? 0,
        showCorrectAnswers: dto.showCorrectAnswers ?? false,
        openAt: dto.openAt ? new Date(dto.openAt) : undefined,
        closeAt: dto.closeAt ? new Date(dto.closeAt) : undefined,
        sessions: dto.sessionIds?.length
          ? { create: dto.sessionIds.map((sessionId) => ({ sessionId })) }
          : undefined,
        questions: {
          create: dto.questions.map((q, i) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            order: q.order ?? i + 1,
          })),
        },
      } as any,
      include: {
        sessions: {
          include: {
            session: { select: { id: true, title: true, sessionNumber: true } },
          },
          orderBy: { session: { sessionNumber: 'asc' } },
        },
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { questions: true } },
      } as any,
    });

    // Notify all fellows in the cohort about the new quiz (in-app)
    if (dto.cohortId) {
      const fellows = await this.prisma.user.findMany({
        where: { cohortId: dto.cohortId, role: 'FELLOW' },
        select: { id: true },
      });
      if (fellows.length > 0) {
        await this.notificationsService.createBulkNotifications(
          fellows.map((f) => ({
            userId: f.id,
            type: 'QUIZ_REMINDER' as any,
            title: 'New Quiz Available!',
            message: `"${dto.title}" is now available for you to take.`,
            data: { quizId: quiz.id },
          })),
        );
      }
    }

    try {
      await this.quizUnlockNotificationService.sendUnlockEmailsWhenQuizOpen(
        quiz.id,
      );
    } catch (err) {
      this.logger.warn(
        `Quiz unlock email pass failed after create (${quiz.id}): ${err}`,
      );
    }

    return quiz;
  }

  async deleteQuiz(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Find users who earned points from this quiz
    const pointsEntries = await this.prisma.pointsLog.findMany({
      where: { quizId },
      select: { userId: true, points: true },
    });

    // Notify each affected user about point deduction
    if (pointsEntries.length > 0) {
      await Promise.allSettled(
        pointsEntries.map((entry) =>
          this.notificationsService.createBulkNotifications([
            {
              userId: entry.userId,
              type: 'SYSTEM_ALERT' as any,
              title: 'Quiz Removed',
              message: `"${quiz.title}" has been deleted. Your ${entry.points} leaderboard points from this quiz have been removed.`,
              data: {},
            },
          ]),
        ),
      );
    }

    // Notify all cohort fellows about the deletion (even those with no points)
    if (quiz.cohortId) {
      const notifiedUserIds = new Set(pointsEntries.map((e) => e.userId));
      const remainingFellows = await this.prisma.user.findMany({
        where: {
          cohortId: quiz.cohortId,
          role: 'FELLOW',
          id: { notIn: [...notifiedUserIds] },
        },
        select: { id: true },
      });
      if (remainingFellows.length > 0) {
        await this.notificationsService.createBulkNotifications(
          remainingFellows.map((f) => ({
            userId: f.id,
            type: 'SYSTEM_ALERT' as any,
            title: 'Quiz Removed',
            message: `"${quiz.title}" has been removed by your facilitator.`,
            data: {},
          })),
        );
      }
    }

    return this.prisma.quiz.delete({ where: { id: quizId } });
  }

  async updateQuiz(
    quizId: string,
    dto: {
      title?: string;
      description?: string;
      timeLimit?: number;
      passingScore?: number;
      pointValue?: number;
      maxAttempts?: number;
      showCorrectAnswers?: boolean;
      openAt?: string | null;
      closeAt?: string | null;
      questions?: Array<{
        question: string;
        options: string[];
        correctAnswer: string;
        order?: number;
      }>;
    },
  ) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // If questions are provided, replace them
    if (dto.questions) {
      await this.prisma.quizQuestion.deleteMany({ where: { quizId } });
      await this.prisma.quizQuestion.createMany({
        data: dto.questions.map((q, i) => ({
          quizId,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          order: q.order ?? i + 1,
        })),
      });
    }

    const updated = await this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.timeLimit !== undefined && { timeLimit: dto.timeLimit }),
        ...(dto.passingScore !== undefined && {
          passingScore: dto.passingScore,
        }),
        ...(dto.pointValue !== undefined && { pointValue: dto.pointValue }),
        ...(dto.maxAttempts !== undefined && { maxAttempts: dto.maxAttempts }),
        ...(dto.showCorrectAnswers !== undefined && {
          showCorrectAnswers: dto.showCorrectAnswers,
        }),
        ...(dto.openAt !== undefined && {
          openAt: dto.openAt ? new Date(dto.openAt) : null,
        }),
        ...(dto.closeAt !== undefined && {
          closeAt: dto.closeAt ? new Date(dto.closeAt) : null,
        }),
      },
      include: {
        sessions: {
          include: {
            session: { select: { id: true, title: true, sessionNumber: true } },
          },
        },
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { questions: true, responses: true } },
      } as any,
    });

    try {
      await this.quizUnlockNotificationService.sendUnlockEmailsWhenQuizOpen(
        updated.id,
      );
    } catch (err) {
      this.logger.warn(
        `Quiz unlock email pass failed after update (${updated.id}): ${err}`,
      );
    }

    return updated;
  }

  async notifyLiveQuizJoin(liveQuizId: string, requesterId: string) {
    // Get live quiz with its session-linked cohort fellows
    const liveQuiz = await (this.prisma.liveQuiz as any).findUnique({
      where: { id: liveQuizId },
      include: {
        sessions: {
          include: { session: { select: { cohortId: true, title: true } } },
        },
        participants: { select: { userId: true } },
      },
    });
    if (!liveQuiz) throw new NotFoundException('Live quiz not found');

    const cohortIds: string[] = [
      ...new Set(
        liveQuiz.sessions
          .map((s: any) => s.session.cohortId)
          .filter(Boolean) as string[],
      ),
    ];

    const joinedUserIds = new Set(
      liveQuiz.participants.map((p: any) => p.userId),
    );

    for (const cohortId of cohortIds) {
      const fellows = await this.prisma.user.findMany({
        where: { cohortId, role: 'FELLOW' },
        select: { id: true },
      });
      const notJoined = fellows.filter((f) => !joinedUserIds.has(f.id));

      if (notJoined.length > 0) {
        await this.notificationsService.createBulkNotifications(
          notJoined.map((f) => ({
            userId: f.id,
            type: 'QUIZ_REMINDER' as any,
            title: 'Live Quiz Starting Soon!',
            message: `Join the live quiz "${liveQuiz.title}" now — it's about to start!`,
            data: { liveQuizId },
          })),
        );
      }
    }

    return { notified: joinedUserIds.size === 0 ? 'all' : 'non-joined' };
  }

  /** Retired / broken IDs — never use (matches session-analytics & discussion-scoring). */
  private static readonly BLOCKED_QUIZ_OPENROUTER_MODELS = new Set([
    'qwen/qwen2.5-72b-instruct:free',
  ]);

  private sanitizeOpenRouterModelIdForQuiz(raw: string | undefined): string | null {
    const id = raw?.trim();
    if (!id) return null;
    if (AdminService.BLOCKED_QUIZ_OPENROUTER_MODELS.has(id)) return null;
    return id;
  }

  /**
   * Same wiring as `SessionAnalyticsService` / `DiscussionScoringService`:
   * `OPENROUTER_MODEL`, then comma-separated `OPENROUTER_MODEL_FALLBACKS`, then safe free defaults.
   */
  private getQuizGenerationModelCandidates(): string[] {
    const primary =
      this.sanitizeOpenRouterModelIdForQuiz(process.env.OPENROUTER_MODEL) ??
      'qwen/qwen3.6-plus';
    const fallbackRaw = process.env.OPENROUTER_MODEL_FALLBACKS || '';
    const fromEnv = fallbackRaw
      .split(',')
      .map((s) => this.sanitizeOpenRouterModelIdForQuiz(s))
      .filter((x): x is string => x !== null);
    const safeDefaults = [
      'openai/gpt-oss-120b:free',
      'z-ai/glm-4.5-air:free',
      'minimax/minimax-m2.5:free',
    ];
    return [primary, ...fromEnv, ...safeDefaults].filter(
      (v, i, a) => v && a.indexOf(v) === i,
    );
  }

  private isRetryableOpenRouterQuizError(msg: string): boolean {
    return /429|503|rate limit|resource has been exhausted|temporarily unavailable|overloaded/i.test(
      msg,
    );
  }

  private async callOpenRouterQuizCompletionSingle(
    apiKey: string,
    prompt: string,
    completionBudget: number,
    modelName: string,
  ): Promise<string> {
    const envMax = Number(process.env.OPENROUTER_MAX_TOKENS || 2048);
    const reasoningEnabled = process.env.OPENROUTER_REASONING === 'true';
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (process.env.OPENROUTER_HTTP_REFERER) {
      headers['HTTP-Referer'] = process.env.OPENROUTER_HTTP_REFERER;
    }
    if (process.env.OPENROUTER_APP_TITLE) {
      headers['X-OpenRouter-Title'] = process.env.OPENROUTER_APP_TITLE;
    }
    const body: Record<string, unknown> = {
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: Math.min(envMax, completionBudget),
    };
    if (reasoningEnabled) {
      (body as { reasoning?: { enabled: boolean } }).reasoning = {
        enabled: true,
      };
    }
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${text}`);
    }
    const completion = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return completion.choices?.[0]?.message?.content || '';
  }

  /** Try primary, then `OPENROUTER_MODEL_FALLBACKS`, then built-in free models (402 / 429 / etc.). */
  private async runOpenRouterQuizWithFallbacks(
    apiKey: string,
    prompt: string,
    completionBudget: number,
  ): Promise<string> {
    const candidates = this.getQuizGenerationModelCandidates();
    let lastErr: Error | null = null;

    for (const modelName of candidates) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await this.callOpenRouterQuizCompletionSingle(
            apiKey,
            prompt,
            completionBudget,
            modelName,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          lastErr = err instanceof Error ? err : new Error(msg);
          const is402 = /\b402\b|insufficient credits|more credits/i.test(msg);
          if (is402) break;
          if (this.isRetryableOpenRouterQuizError(msg) && attempt < 2) {
            await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
            continue;
          }
          break;
        }
      }
    }

    const finalMsg = lastErr?.message ?? 'unknown';
    if (/\b402\b|insufficient credits|more credits/i.test(finalMsg)) {
      throw new HttpException(
        'OpenRouter account has insufficient credits for this request (all models failed). Try fewer questions, add credits at openrouter.ai/settings/credits, or set OPENROUTER_MAX_TOKENS lower.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    throw new BadGatewayException(`OpenRouter API error: ${finalMsg}`);
  }

  async generateAIQuizQuestions(dto: GenerateAIQuestionsDto) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey)
      throw new BadGatewayException('OpenRouter API key not configured');

    // Resolve session IDs — for MEGA (cohortId only), fetch all sessions in cohort
    let sessionIds = dto.sessionIds ?? [];
    if (!sessionIds.length && dto.cohortId) {
      const cohortSessions = await this.prisma.session.findMany({
        where: { cohortId: dto.cohortId },
        select: { id: true },
      });
      sessionIds = cohortSessions.map((s) => s.id);
    }

    // Fetch transcripts + session titles for any resolved session IDs
    let transcriptContext = '';
    let sessionTitlesFromDb: string[] = [];
    if (sessionIds.length) {
      const analytics = await (this.prisma.sessionAnalytics as any).findMany({
        where: { sessionId: { in: sessionIds }, transcript: { not: null } },
        select: { transcript: true, session: { select: { title: true } } },
      });
      sessionTitlesFromDb = analytics
        .map((a: any) => a.session?.title)
        .filter(Boolean);
      // Truncate each transcript to avoid token limits (≈2000 chars each)
      transcriptContext = analytics
        .filter((a: any) => a.transcript)
        .map((a: any) => (a.transcript as string).slice(0, 2000))
        .join('\n\n---\n\n');
    }

    // Derive topic: explicit > quiz title > session titles > fallback
    const topic =
      dto.topic ||
      dto.quizTitle ||
      (sessionTitlesFromDb.length
        ? sessionTitlesFromDb.join(', ')
        : 'career development');

    const facilitatorNotes = dto.context?.trim() || '';
    const contextBlocks: string[] = [];
    if (facilitatorNotes) {
      contextBlocks.push(`Facilitator instructions (tone, scope, what to avoid):\n${facilitatorNotes}`);
    }
    if (transcriptContext) {
      contextBlocks.push(`Session transcript excerpts:\n${transcriptContext}`);
    }
    const context = contextBlocks.join('\n\n---\n\n');

    // Smaller batches keep each OpenRouter request within tight credit limits (402)
    // and avoid huge completion payloads. Chunk size 8 keeps ~max_tokens under ~800 per call.
    const CHUNK = 8;
    const chunkCounts: number[] = [];
    for (let left = dto.questionCount; left > 0; left -= Math.min(CHUNK, left)) {
      chunkCounts.push(Math.min(CHUNK, left));
    }

    const difficultyHint =
      dto.difficulty === 'easy'
        ? 'Simple recall/recognition questions'
        : dto.difficulty === 'medium'
          ? 'Comprehension and application questions'
          : 'Analysis and evaluation questions';

    const buildPrompt = (count: number) =>
      `Generate exactly ${count} ${dto.difficulty}-difficulty multiple-choice quiz questions about: "${topic}"${context ? `\n\nUse the following as background source material (sessions, notes, or facilitator instructions — not text to quote):\n${context}` : ''}

Return ONLY a JSON array with no explanation or markdown fences:
[
  {
    "question": "Question text ending with ?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A"
  }
]

Rules:
- Each question must have exactly 4 options
- correctAnswer must be one of the options verbatim
- ${difficultyHint}
- Write standalone questions that could appear on a quiz without having attended the session: avoid framing like "during the session", "in the poll", "participants indicated" unless necessary for a concept question
- Prefer principles, definitions, scenarios, and applications over trivia about session mechanics or icebreakers
- Questions should be clear, unambiguous, and educational`;

    const parseQuestionsJson = (raw: string): any[] => {
      const stripped = raw
        .replace(/```(?:json)?\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();
      const jsonMatch = stripped.match(/\[[\s\S]*\]/);
      if (!jsonMatch)
        throw new BadGatewayException(
          'AI returned an unparseable response. Try again.',
        );
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new BadGatewayException(
          'AI returned an unparseable response. Try again.',
        );
      }
    };

    let generated: any[] = [];
    try {
      for (const n of chunkCounts) {
        const prompt = buildPrompt(n);
        // ~70 output tokens per MCQ + small overhead; stay well under low credit ceilings
        const completionBudget = n * 70 + 180;
        const raw = await this.runOpenRouterQuizWithFallbacks(
          apiKey,
          prompt,
          completionBudget,
        );
        generated = generated.concat(parseQuestionsJson(raw));
      }
    } catch (err: unknown) {
      if (err instanceof HttpException) throw err;
      throw new BadGatewayException(
        `OpenRouter API error: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }

    return {
      questions: generated.map((q: any, i: number) => ({
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer,
        order: i + 1,
      })),
    };
  }

  async awardSessionPoints(
    sessionId: string,
    awards: Array<{
      userId: string;
      points: number;
      reason?: string;
      bypassMonthlyCap?: boolean;
    }>,
    actorUserId: string,
  ) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, title: true, sessionNumber: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, role: true },
    });
    if (!actor) throw new ForbiddenException('User not found');

    const results: Array<{ userId: string; points: number; awarded: boolean }> =
      [];

    for (const award of awards) {
      if (award.points <= 0) continue;
      try {
        const bypassMonthlyCap = actor.role === 'ADMIN' && award.bypassMonthlyCap === true;

        const res = await this.pointsService.awardPoints({
          userId: award.userId,
          points: award.points,
          eventType: 'SESSION_ATTEND' as any,
          description: award.reason ?? `Session engagement: ${session.title}`,
          bypassMonthlyCap,
          metadata: {
            sessionId: session.id,
            awardedBy: actorUserId,
          } as any,
        });

        results.push({
          userId: award.userId,
          points: award.points,
          awarded: res.awarded,
        });
      } catch {
        results.push({
          userId: award.userId,
          points: award.points,
          awarded: false,
        });
      }
    }

    await this.prisma.adminAuditLog.create({
      data: {
        adminId: actorUserId,
        action: 'SESSION_POINTS_AWARDED',
        entityType: 'Session',
        entityId: sessionId,
        changes: { awards: results },
      },
    });

    return { sessionId, results };
  }

  async duplicateCohort(
    cohortId: string,
    newName: string | undefined,
    adminId: string,
  ) {
    // Load the source cohort with all sessions and resources
    const source = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        sessions: {
          include: {
            resources: true,
          },
          orderBy: { sessionNumber: 'asc' },
        },
      },
    });

    if (!source) {
      throw new NotFoundException('Cohort not found');
    }

    const name = newName?.trim() || `${source.name} (Copy)`;

    // Create the new cohort (PENDING state so it doesn't conflict with ACTIVE)
    const newCohort = await this.prisma.cohort.create({
      data: {
        name,
        startDate: source.startDate,
        endDate: source.endDate,
        state: 'PENDING',
      },
    });

    // Duplicate sessions and resources
    for (const session of source.sessions) {
      const newSession = await this.prisma.session.create({
        data: {
          cohortId: newCohort.id,
          sessionNumber: session.sessionNumber,
          title: session.title,
          description: session.description,
          monthTheme: session.monthTheme,
          scheduledDate: session.scheduledDate,
          unlockDate: session.unlockDate,
        },
      });

      // Duplicate resources for this session
      if (session.resources.length > 0) {
        await this.prisma.resource.createMany({
          data: session.resources.map((r) => ({
            sessionId: newSession.id,
            type: r.type,
            title: r.title,
            description: r.description,
            url: r.url,
            duration: r.duration,
            estimatedMinutes: r.estimatedMinutes,
            minimumTimeThreshold: r.minimumTimeThreshold,
            isCore: r.isCore,
            pointValue: r.pointValue,
            order: r.order,
            state: 'LOCKED',
          })),
        });
      }
    }

    // Create a default chat channel for the new cohort
    await this.chatService.createChannel(
      {
        cohortId: newCohort.id,
        name: `${name} - General Chat`,
        description: `Main chat room for ${name} cohort`,
        type: 'COHORT_WIDE',
      },
      adminId,
    );

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'DUPLICATE_COHORT',
        entityType: 'Cohort',
        entityId: newCohort.id,
        changes: { sourceCohortId: cohortId, newName: name },
      },
    });

    return newCohort;
  }

  async getAchievements() {
    const achievements = await this.prisma.achievement.findMany({
      orderBy: [{ type: 'asc' }, { pointValue: 'asc' }],
    });

    // Load fellow unlocks in one query (avoids relying on nested filters on Achievement.include,
    // which can be inconsistent across Prisma versions) and group by achievement for counts + lists.
    const fellowUnlocks = await this.prisma.userAchievement.findMany({
      where: { user: { role: UserRole.FELLOW } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { unlockedAt: 'desc' },
    });

    const unlockedByAchievementId = new Map<
      string,
      Array<{ id: string; firstName: string; lastName: string }>
    >();

    for (const ua of fellowUnlocks) {
      const u = ua.user;
      if (!u) continue;
      const list = unlockedByAchievementId.get(ua.achievementId) ?? [];
      list.push({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
      });
      unlockedByAchievementId.set(ua.achievementId, list);
    }

    return achievements.map((achievement) => {
      const unlockedBy = unlockedByAchievementId.get(achievement.id) ?? [];
      return {
        ...achievement,
        unlockedBy,
        unlockedByCount: unlockedBy.length,
      };
    });
  }

  async updateAchievement(
    id: string,
    data: {
      name?: string;
      description?: string;
      pointValue?: number;
      iconUrl?: string;
      criteria?: Record<string, any>;
      type?: string;
    },
    adminId: string,
  ) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id },
    });
    if (!achievement) throw new NotFoundException('Achievement not found');

    const updated = await this.prisma.achievement.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.pointValue !== undefined && { pointValue: data.pointValue }),
        ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl }),
        ...(data.criteria !== undefined && { criteria: data.criteria }),
        ...(data.type !== undefined && { type: data.type as any }),
      },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        action: 'UPDATE_ACHIEVEMENT',
        entityType: 'Achievement',
        entityId: id,
        changes: data,
      },
    });

    return updated;
  }
}
