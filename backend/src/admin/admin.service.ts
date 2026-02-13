import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  BadGatewayException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ResourceState } from '@prisma/client';
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
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SessionAnalyticsService } from '../session-analytics/session-analytics.service';
import {
  CreateResourceDto,
  UpdateResourceDto,
} from '../resources/dto/create-resource.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private chatService: ChatService,
    private sessionAnalyticsService: SessionAnalyticsService,
  ) {}

  // ============ Cohort Management Methods ============

  async getAllCohorts() {
    const cohorts = await this.prisma.cohort.findMany({
      include: {
        _count: {
          select: { sessions: true },
        },
        facilitator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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
    if (
      requester.role === 'FELLOW' &&
      requester.cohortId !== cohortId
    ) {
      throw new ForbiddenException('You can only view your own cohort members');
    }
    if (
      requester.role === 'FACILITATOR' &&
      requester.cohortId !== cohortId
    ) {
      throw new ForbiddenException(
        'You can only view members of your assigned cohort',
      );
    }

    return this.prisma.user.findMany({
      where: { cohortId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        currentMonthPoints: true,
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });
  }

  async createCohort(dto: CreateCohortDto, adminId: string) {
    const cohort = await this.prisma.cohort.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        state: 'ACTIVE',
        facilitatorId: dto.facilitatorId,
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

    const updatedCohort = await this.prisma.cohort.update({
      where: { id: cohortId },
      data: dto,
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
    if (requester?.role === 'FACILITATOR' && requester.cohortId !== session.cohortId) {
      throw new ForbiddenException('Facilitators can only edit sessions in their own cohort');
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
            { resourceProgress: { some: {} } },
            { discussions: { some: {} } },
            { quizResponses: { some: {} } },
          ],
        },
      }),
      this.prisma.resource.count(),
      this.prisma.cohort.count(),
      this.prisma.user.count({ where: { role: 'FELLOW' } }),
      this.prisma.user.count({ where: { role: 'FACILITATOR' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, role: 'FELLOW' } }),
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

    if (requester.role === 'FACILITATOR' && requester.cohortId !== session.cohortId) {
      throw new BadRequestException('Facilitators can only manage resources in their cohort');
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
        pointValue: dto.pointValue || 100,
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
        throw new BadRequestException('Facilitators can only manage resources in their cohort');
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

      if (requester.role === 'FACILITATOR' && session.cohortId !== requester.cohortId) {
        throw new BadRequestException('Facilitators can only move resources within their cohort');
      }
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
        ...(dto.pointValue !== undefined && { pointValue: dto.pointValue }),
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

  async toggleResourceLock(resourceId: string, state: string, requesterId: string) {
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
        if (!resource.session || resource.session.cohortId !== requester.cohortId) {
          throw new ForbiddenException('Facilitators can only manage resources in their cohort');
        }
      }
    }

    const updated = await this.prisma.resource.update({
      where: { id: resourceId },
      data: { state: state as ResourceState },
      include: {
        session: {
          select: { id: true, scheduledDate: true, unlockDate: true },
        },
      },
    });

    // Notify all fellows in the cohort when a resource is manually unlocked
    if (state === 'UNLOCKED' && resource.session?.cohortId) {
      try {
        await this.notificationsService.notifyFellowsResourceUnlocked(
          resourceId,
          resource.session.cohortId,
          resource.title,
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
        throw new BadRequestException('Facilitators can only manage resources in their cohort');
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
          throw new BadRequestException('Facilitators can only view resources in their cohort');
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

    if (requester.role === 'FACILITATOR' && requester.cohortId !== dto.cohortId) {
      throw new ForbiddenException('Facilitators can only create sessions for their own cohort');
    }

    const cohort = await this.prisma.cohort.findUnique({ where: { id: dto.cohortId } });
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

    if (requester.role === 'FACILITATOR' && requester.cohortId !== session.cohortId) {
      throw new ForbiddenException('Facilitators can only view attendance for their own cohort');
    }

    const [fellows, attendances] = await Promise.all([
      this.prisma.user.findMany({
        where: { cohortId: session.cohortId, role: 'FELLOW' },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
      this.prisma.attendance.findMany({
        where: { sessionId },
        select: { userId: true, isLate: true, isExcused: true, notes: true, checkInTime: true },
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

  async markBulkAttendance(sessionId: string, dto: BulkMarkAttendanceDto, requesterId: string) {
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

    if (requester.role === 'FACILITATOR' && requester.cohortId !== session.cohortId) {
      throw new ForbiddenException('Facilitators can only mark attendance for their own cohort');
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

  async submitAiReview(sessionId: string, dto: AiReviewDto, requesterId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, cohortId: true },
    });
    if (!requester) throw new NotFoundException('User not found');

    if (requester.role === 'FACILITATOR' && requester.cohortId !== session.cohortId) {
      throw new ForbiddenException('Access denied');
    }

    return this.sessionAnalyticsService.processSessionAnalytics(sessionId, dto.transcript);
  }

  async aiChat(sessionId: string, dto: AiChatDto, requesterId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { cohort: { select: { name: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { role: true, cohortId: true },
    });
    if (!requester) throw new NotFoundException('User not found');

    if (requester.role === 'FACILITATOR' && requester.cohortId !== session.cohortId) {
      throw new ForbiddenException('Access denied');
    }

    return this.sessionAnalyticsService.chatAboutSession(
      sessionId,
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

    if (requester.role === 'FACILITATOR' && requester.cohortId !== session.cohortId) {
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
          include: { session: { select: { id: true, title: true, sessionNumber: true } } },
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
          include: { session: { select: { id: true, title: true, sessionNumber: true } } },
          orderBy: { session: { sessionNumber: 'asc' } },
        },
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { questions: true } },
      } as any,
    });

    // Notify all fellows in the cohort about the new quiz
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

    return quiz;
  }

  async deleteQuiz(quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return this.prisma.quiz.delete({ where: { id: quizId } });
  }

  async updateQuiz(quizId: string, dto: {
    title?: string;
    description?: string;
    timeLimit?: number;
    passingScore?: number;
    pointValue?: number;
    openAt?: string | null;
    closeAt?: string | null;
    questions?: Array<{ question: string; options: string[]; correctAnswer: string; order?: number }>;
  }) {
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

    return this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.timeLimit !== undefined && { timeLimit: dto.timeLimit }),
        ...(dto.passingScore !== undefined && { passingScore: dto.passingScore }),
        ...(dto.pointValue !== undefined && { pointValue: dto.pointValue }),
        ...(dto.openAt !== undefined && { openAt: dto.openAt ? new Date(dto.openAt) : null }),
        ...(dto.closeAt !== undefined && { closeAt: dto.closeAt ? new Date(dto.closeAt) : null }),
      },
      include: {
        sessions: {
          include: { session: { select: { id: true, title: true, sessionNumber: true } } },
        },
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { questions: true, responses: true } },
      } as any,
    });
  }

  async notifyLiveQuizJoin(liveQuizId: string, requesterId: string) {
    // Get live quiz with its session-linked cohort fellows
    const liveQuiz = await (this.prisma.liveQuiz as any).findUnique({
      where: { id: liveQuizId },
      include: {
        sessions: { include: { session: { select: { cohortId: true, title: true } } } },
        participants: { select: { userId: true } },
      },
    });
    if (!liveQuiz) throw new NotFoundException('Live quiz not found');

    const cohortIds: string[] = [...new Set(
      liveQuiz.sessions.map((s: any) => s.session.cohortId).filter(Boolean) as string[]
    )];

    const joinedUserIds = new Set(liveQuiz.participants.map((p: any) => p.userId));

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

  async generateAIQuizQuestions(dto: GenerateAIQuestionsDto) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new BadGatewayException('Gemini API key not configured');

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
      (sessionTitlesFromDb.length ? sessionTitlesFromDb.join(', ') : 'career development');

    const context = transcriptContext || dto.context;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      generationConfig: { temperature: 0.7 },
    });

    const prompt = `Generate exactly ${dto.questionCount} ${dto.difficulty}-difficulty multiple-choice quiz questions about: "${topic}"${context ? `\n\nBase your questions on the following session content:\n${context}` : ''}

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
- ${dto.difficulty === 'easy' ? 'Simple recall/recognition questions' : dto.difficulty === 'medium' ? 'Comprehension and application questions' : 'Analysis and evaluation questions'}
- Questions should be directly relevant to the topic/session content above
- Questions should be clear, unambiguous, and educational`;

    let result: any;
    try {
      result = await model.generateContent(prompt);
    } catch (err: any) {
      throw new BadGatewayException(`Gemini API error: ${err?.message ?? 'unknown'}`);
    }

    const raw = result.response.text();
    const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/gi, '').trim();
    const jsonMatch = stripped.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new BadGatewayException('AI returned an unparseable response. Try again.');

    let generated: any[];
    try {
      generated = JSON.parse(jsonMatch[0]);
    } catch {
      throw new BadGatewayException('AI returned an unparseable response. Try again.');
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
}
