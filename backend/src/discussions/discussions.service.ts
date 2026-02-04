import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDiscussionDto, CreateCommentDto, DiscussionFilterDto } from './dto/discussion.dto';

@Injectable()
export class DiscussionsService {
  constructor(private prisma: PrismaService) {}

  async createDiscussion(userId: string, dto: CreateDiscussionDto) {
    return this.prisma.discussion.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId: userId,
        cohortId: dto.cohortId || '',
        resourceId: dto.resourceId || '',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async getDiscussions(filters: DiscussionFilterDto) {
    const { page = 1, limit = 10, search, cohortId, authorId, isPinned } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cohortId) where.cohortId = cohortId;
    if (authorId) where.authorId = authorId;
    if (isPinned !== undefined) where.isPinned = isPinned;

    const [discussions, total] = await Promise.all([
      this.prisma.discussion.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      }),
      this.prisma.discussion.count({ where }),
    ]);

    return {
      data: discussions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDiscussion(id: string) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    return discussion;
  }

  async likeDiscussion(discussionId: string, userId: string) {
    // Likes not implemented in current schema
    return { message: 'Likes feature not available' };
  }

  async getComments(discussionId: string) {
    return this.prisma.discussionComment.findMany({
      where: { discussionId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async createComment(discussionId: string, userId: string, dto: CreateCommentDto) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    return this.prisma.discussionComment.create({
      data: {
        content: dto.content,
        userId: userId,
        discussionId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async deleteDiscussion(id: string, userId: string, userRole: string) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (discussion.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own discussions');
    }

    await this.prisma.discussion.delete({ where: { id } });
    return { message: 'Discussion deleted successfully' };
  }
}
