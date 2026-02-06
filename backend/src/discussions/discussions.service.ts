import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDiscussionDto, CreateCommentDto, DiscussionFilterDto } from './dto/discussion.dto';

@Injectable()
export class DiscussionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper function to award points
   */
  private async awardPoints(
    userId: string,
    points: number,
    eventType: string,
    description: string
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    // Log points
    await this.prisma.pointsLog.create({
      data: {
        userId,
        points,
        eventType: eventType as any,
        description,
      },
    });

    return true;
  }

  async createDiscussion(userId: string, dto: CreateDiscussionDto) {
    const discussion = await this.prisma.discussion.create({
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

    // Award 5 points for creating a discussion (with monthly cap enforcement)
    const awarded = await this.awardPoints(
      userId,
      5,
      'DISCUSSION_POST',
      `Posted discussion: ${dto.title}`
    );

    return {
      ...discussion,
      pointsAwarded: awarded ? 5 : 0,
      cappedMessage: awarded ? null : 'Monthly point cap reached',
    };
  }

  async getDiscussions(filters: DiscussionFilterDto) {
    const { page = 1, limit = 10, search, cohortId, resourceId, authorId, isPinned } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (cohortId) where.cohortId = cohortId;
    if (resourceId) where.resourceId = resourceId;
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
            select: { comments: true, likes: true },
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
          select: { comments: true, likes: true },
        },
      },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    return discussion;
  }

  async likeDiscussion(discussionId: string, userId: string) {
    const existing = await this.prisma.discussionLike.findUnique({
      where: {
        discussionId_userId: { discussionId, userId },
      },
    });

    if (existing) {
      await this.prisma.discussionLike.delete({
        where: { id: existing.id },
      });
      return { liked: false };
    }

    await this.prisma.discussionLike.create({
      data: { discussionId, userId },
    });
    return { liked: true };
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

    const comment = await this.prisma.discussionComment.create({
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

    // Award 2 points for replying to a discussion (with monthly cap enforcement)
    const awarded = await this.awardPoints(
      userId,
      2,
      'DISCUSSION_REPLY',
      `Replied to discussion: ${discussion.title}`
    );

    return {
      ...comment,
      pointsAwarded: awarded ? 2 : 0,
      cappedMessage: awarded ? null : 'Monthly point cap reached',
    };
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
