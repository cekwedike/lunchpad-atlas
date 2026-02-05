import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateCohortDto, UpdateSessionDto } from './dto/admin.dto';

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
      unlockDate.setDate(unlockDate.getDate() - 6); // 6 days before
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
}
