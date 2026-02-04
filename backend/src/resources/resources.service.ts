import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ResourceQueryDto } from './dto/resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async getResources(userId: string, query: ResourceQueryDto) {
    const { type, sessionId, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (sessionId) where.sessionId = sessionId;
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
        include: {
          progress: {
            where: { userId },
            select: { state: true, completedAt: true },
          },
        },
        orderBy: { order: 'asc' },
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      data: resources.map((r) => ({
        ...r,
        state: r.progress[0]?.state || 'LOCKED',
        completedAt: r.progress[0]?.completedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getResourceById(resourceId: string, userId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        session: true,
        progress: {
          where: { userId },
        },
        quiz: {
          include: {
            questions: true,
          },
        },
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return {
      ...resource,
      state: resource.progress[0]?.state || 'LOCKED',
      completedAt: resource.progress[0]?.completedAt,
    };
  }

  async markComplete(resourceId: string, userId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Update or create progress
    const progress = await this.prisma.resourceProgress.upsert({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
      update: {
        state: 'COMPLETED',
        completedAt: new Date(),
      },
      create: {
        userId,
        resourceId,
        state: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Award points
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        points: { increment: resource.pointsValue },
      },
    });

    // Log points
    await this.prisma.pointsLog.create({
      data: {
        userId,
        points: resource.pointsValue,
        source: 'RESOURCE_COMPLETE',
        description: `Completed: ${resource.title}`,
      },
    });

    return progress;
  }
}
