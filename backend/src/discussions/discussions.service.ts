import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDiscussionDto, CreateCommentDto, DiscussionFilterDto } from './dto/discussion.dto';
import { DiscussionScoringService } from './discussion-scoring.service';
import { DiscussionsGateway } from './discussions.gateway';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DiscussionsService {
  constructor(
    private prisma: PrismaService,
    private discussionScoring: DiscussionScoringService,
    private discussionsGateway: DiscussionsGateway,
    private notificationsService: NotificationsService,
  ) {}

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

  async createDiscussion(userId: string, userRole: string, dto: CreateDiscussionDto) {
    // Only Admin and Facilitator can create discussions
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException('Only administrators and facilitators can create discussions');
    }

    // Get user's cohortId if not provided
    let cohortId = dto.cohortId;
    if (!cohortId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });
      cohortId = user?.cohortId || '';
    }

    const discussion = await this.prisma.discussion.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId: userId,
        cohortId: cohortId,
        resourceId: dto.resourceId || '',
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
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

    // Broadcast new discussion to cohort in real-time
    this.discussionsGateway.broadcastNewDiscussion(discussion);

    // Notify all cohort members about new discussion  
    if (cohortId) {
      const cohortMembers = await this.prisma.user.findMany({
        where: {
          cohortId: cohortId,
          id: { not: userId }, // Don't notify the author
        },
        select: { id: true },
      });

      if (cohortMembers.length > 0) {
        const authorName = `${discussion.user.firstName} ${discussion.user.lastName}`;
        await this.notificationsService.notifyBulkNewDiscussion(
          cohortMembers.map((m) => m.id),
          authorName,
          discussion.title,
          discussion.id,
        );
      }
    }

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
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
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
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
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
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
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

    // Check if discussion is locked
    if (discussion.isLocked) {
      throw new ForbiddenException('This discussion is locked. No new comments allowed.');
    }

    const comment = await this.prisma.discussionComment.create({
      data: {
        content: dto.content,
        userId: userId,
        discussionId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
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

    // Broadcast new comment to discussion participants in real-time
    this.discussionsGateway.broadcastNewComment(comment, discussionId, discussion.cohortId);

    // Notify discussion author
    if (discussion.userId !== userId) {
      const commenterName = `${comment.user.firstName} ${comment.user.lastName}`;
      const discussionWithAuthor = await this.prisma.discussion.findUnique({
        where: { id: discussionId },
        select: { title: true, userId: true },
      });
      
      if (discussionWithAuthor) {
        await this.notificationsService.notifyDiscussionReply(
          discussionWithAuthor.userId,
          commenterName,
          discussionWithAuthor.title,
          discussionId,
        );
      }
    }

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

    // Admin or Facilitator can delete any discussion
    if (discussion.userId !== userId && userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException('Only administrators and facilitators can delete discussions');
    }

    await this.prisma.discussion.delete({ where: { id } });
    return { message: 'Discussion deleted successfully' };
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.discussionComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Users can delete their own comments, admins can delete any
    if (comment.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.discussionComment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted successfully' };
  }

  async updateComment(commentId: string, userId: string, dto: CreateCommentDto) {
    const comment = await this.prisma.discussionComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Users can only edit their own comments
    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.discussionComment.update({
      where: { id: commentId },
      data: { content: dto.content },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    return updated;
  }

  // AI Quality Scoring
  async scoreDiscussionQuality(discussionId: string) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        resource: {
          select: { title: true, description: true },
        },
      },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Get AI analysis
    const resourceContext = discussion.resource 
      ? `${discussion.resource.title}: ${discussion.resource.description || ''}`
      : undefined;

    const analysis = await this.discussionScoring.scoreDiscussion(
      discussion.title,
      discussion.content,
      resourceContext,
    );

    // Update discussion with quality score
    return await this.prisma.discussion.update({
      where: { id: discussionId },
      data: {
        qualityScore: analysis.score,
        qualityAnalysis: analysis as any,
        scoredAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });
  }

  async getHighQualityDiscussions(cohortId?: string, limit: number = 10) {
    const where: any = {
      qualityScore: { gte: 70 },
    };

    if (cohortId) {
      where.cohortId = cohortId;
    }

    return await this.prisma.discussion.findMany({
      where,
      orderBy: { qualityScore: 'desc' },
      take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        resource: {
          select: { id: true, title: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });
  }

  // ==================== ADMIN METHODS ====================

  async togglePin(discussionId: string, userRole: string) {
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Only admins can pin discussions');
    }

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const updated = await this.prisma.discussion.update({
      where: { id: discussionId },
      data: { isPinned: !discussion.isPinned },
    });

    // Broadcast pin status change in real-time
    this.discussionsGateway.broadcastDiscussionUpdate(updated);

    // Notify cohort members if discussion was pinned
    if (updated.isPinned && updated.cohortId) {
      const cohortMembers = await this.prisma.user.findMany({
        where: { cohortId: updated.cohortId },
        select: { id: true },
      });

      for (const member of cohortMembers) {
        await this.notificationsService.notifyDiscussionPinned(
          member.id,
          updated.title,
          updated.id,
        );
      }
    }

    return updated;
  }

  async toggleLock(discussionId: string, userRole: string) {
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Only admins can lock discussions');
    }

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const updated = await this.prisma.discussion.update({
      where: { id: discussionId },
      data: { isLocked: !discussion.isLocked },
    });

    // Broadcast lock status change in real-time
    this.discussionsGateway.broadcastDiscussionUpdate(updated);

    // Notify cohort members if discussion was locked
    if (updated.isLocked && updated.cohortId) {
      const cohortMembers = await this.prisma.user.findMany({
        where: { cohortId: updated.cohortId },
        select: { id: true },
      });

      for (const member of cohortMembers) {
        await this.notificationsService.notifyDiscussionLocked(
          member.id,
          updated.title,
          updated.id,
        );
      }
    }

    return updated;
  }

  async getRecentDiscussions(limit: number = 5) {
    return await this.prisma.discussion.findMany({
      take: limit,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        cohort: {
          select: { id: true, name: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });
  }
}
