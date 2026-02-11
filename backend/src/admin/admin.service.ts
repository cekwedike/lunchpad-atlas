import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateCohortDto,
  UpdateCohortDto,
  UpdateSessionDto,
} from './dto/admin.dto';
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
  ) {}

  // ============ Cohort Management Methods ============

  async getAllCohorts() {
    const cohorts = await this.prisma.cohort.findMany({
      include: {
        _count: {
          select: {
            fellows: { where: { role: 'FELLOW' } },
            sessions: true,
          },
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
      orderBy: {
        startDate: 'desc',
      },
    });

    return cohorts;
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

    const admin = requester;

    await this.notificationsService.notifyAdminsResourceUpdated(
      resource.id,
      `${admin?.firstName} ${admin?.lastName}`,
      'created',
      'RESOURCE_CREATED',
    );

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

    const admin = requester;

    await this.notificationsService.notifyAdminsResourceUpdated(
      resourceId,
      `${admin?.firstName} ${admin?.lastName}`,
      'updated',
      'RESOURCE_UPDATED',
    );

    return updatedResource;
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

    const admin = requester;

    await this.notificationsService.notifyAdminsResourceUpdated(
      resourceId,
      `${admin?.firstName} ${admin?.lastName}`,
      'deleted',
      'RESOURCE_UPDATED',
    );

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

  async getAllResources(filters?: {
    sessionId?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
    requesterId?: string;
  }) {
    const { sessionId, type, search, requesterId } = filters || {};
    // Ensure page and limit are numbers
    const page = Number(filters?.page) || 1;
    const limit = Number(filters?.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (requesterId) {
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
}
