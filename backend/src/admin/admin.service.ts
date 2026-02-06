import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateCohortDto, UpdateSessionDto } from './dto/admin.dto';
import { CreateResourceDto, UpdateResourceDto } from '../resources/dto/create-resource.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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

    return updatedCohort;
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto, adminId: string) {
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

  // ============ Resource Management ============

  async createResource(dto: CreateResourceDto, adminId: string) {
    // Verify session exists
    const session = await this.prisma.session.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
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

    return resource;
  }

  async updateResource(resourceId: string, dto: UpdateResourceDto, adminId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // If sessionId is being changed, verify it exists
    if (dto.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: dto.sessionId },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
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

    return updatedResource;
  }

  async deleteResource(resourceId: string, adminId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        progress: true,
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Check if any users have started this resource
    if (resource.progress && resource.progress.length > 0) {
      throw new BadRequestException(
        `Cannot delete resource: ${resource.progress.length} user(s) have already started this resource`
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

    return { success: true, message: 'Resource deleted successfully' };
  }

  async getResourcesBySession(sessionId: string) {
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
  }) {
    const { sessionId, type, search, page = 1, limit = 50 } = filters || {};
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
