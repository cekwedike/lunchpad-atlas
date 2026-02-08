import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateDiscussionDto, CreateCommentDto, DiscussionFilterDto, DiscussionTopicType } from './dto/discussion.dto';
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

    if (!cohortId) {
      throw new BadRequestException('Cohort is required to create a discussion');
    }

    const topicType: DiscussionTopicType = dto.topicType
      || (dto.resourceId ? 'RESOURCE' : dto.sessionId ? 'SESSION' : 'GENERAL');

    let resourceId: string | undefined;
    let sessionId: string | undefined;

    if (topicType === 'RESOURCE') {
      if (!dto.resourceId) {
        throw new BadRequestException('Resource is required for a resource discussion');
      }

      const resource = await this.prisma.resource.findUnique({
        where: { id: dto.resourceId },
        select: { id: true, sessionId: true, session: { select: { cohortId: true } } },
      });

      if (!resource || resource.session?.cohortId !== cohortId) {
        throw new NotFoundException('Resource not found for this cohort');
      }

      resourceId = resource.id;
      sessionId = resource.sessionId;
    }

    if (topicType === 'SESSION') {
      if (!dto.sessionId) {
        throw new BadRequestException('Session is required for a session topic');
      }

      const session = await this.prisma.session.findUnique({
        where: { id: dto.sessionId },
        select: { id: true, cohortId: true },
      });

      if (!session || session.cohortId !== cohortId) {
        throw new NotFoundException('Session not found for this cohort');
      }

      sessionId = session.id;
    }

    const discussion = await this.prisma.discussion.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId: userId,
        cohortId: cohortId,
        resourceId: resourceId ?? null,
        sessionId: sessionId ?? null,
      } as any,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        resource: {
          select: { id: true, title: true },
        },
      } as any,
    }) as any;

    const session = sessionId
      ? await this.prisma.session.findUnique({
          where: { id: sessionId },
          select: { id: true, sessionNumber: true, title: true },
        })
      : null;

    const discussionWithTopic = {
      ...discussion,
      session,
    };

    // Award 5 points for creating a discussion (with monthly cap enforcement)
    const awarded = await this.awardPoints(
      userId,
      5,
      'DISCUSSION_POST',
      `Posted discussion: ${dto.title}`
    );

    // Broadcast new discussion to cohort in real-time
    this.discussionsGateway.broadcastNewDiscussion(discussionWithTopic);

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
      ...discussionWithTopic,
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
          resource: {
            select: { id: true, title: true },
          },
          _count: {
            select: { comments: true, likes: true },
          },
        },
      }),
      this.prisma.discussion.count({ where }),
    ]);

    const sessionIds = Array.from(
      new Set(discussions.map((discussion) => (discussion as any).sessionId).filter(Boolean))
    ) as string[];
    const sessions = sessionIds.length
      ? await this.prisma.session.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, sessionNumber: true, title: true },
        })
      : [];
    const sessionMap = new Map(sessions.map((session) => [session.id, session]));
    const discussionsWithTopics = discussions.map((discussion) => {
      const discussionSessionId = (discussion as any).sessionId as string | undefined | null;
      return {
        ...discussion,
        session: discussionSessionId ? sessionMap.get(discussionSessionId) || null : null,
      };
    });

    return {
      data: discussionsWithTopics,
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
        resource: {
          select: { id: true, title: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      } as any,
    }) as any;

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    const sessionId = (discussion as any).sessionId as string | undefined | null;
    const session = sessionId
      ? await this.prisma.session.findUnique({
          where: { id: sessionId },
          select: { id: true, sessionNumber: true, title: true },
        })
      : null;

    return {
      ...discussion,
      session,
    };
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

  async getComments(discussionId: string, userId: string) {
    const comments = await (this.prisma as any).discussionComment.findMany({
      where: { discussionId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        reactions: {
          select: { id: true, userId: true, type: true },
        },
      },
    }) as any[];

    return comments.map((comment) => {
      const reactionCounts = (comment.reactions || []).reduce((acc: Record<string, number>, reaction: any) => {
        acc[reaction.type] = (acc[reaction.type] || 0) + 1;
        return acc;
      }, {});

      const userReactions = (comment.reactions || [])
        .filter((reaction: any) => reaction.userId === userId)
        .map((reaction: any) => reaction.type);

      return {
        ...comment,
        reactionCounts,
        userReactions,
      };
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

    if (dto.parentId) {
      const parentComment = await this.prisma.discussionComment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, discussionId: true },
      });

      if (!parentComment || parentComment.discussionId !== discussionId) {
        throw new BadRequestException('Parent comment does not belong to this discussion');
      }
    }

    const comment = await (this.prisma as any).discussionComment.create({
      data: {
        content: dto.content,
        userId: userId,
        discussionId,
        parentId: dto.parentId || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        reactions: {
          select: { id: true, userId: true, type: true },
        },
      },
    }) as any;

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
      const commenterName = `${comment.user?.firstName || ''} ${comment.user?.lastName || ''}`.trim();
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
      reactionCounts: {},
      userReactions: [],
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
    const comment = await (this.prisma as any).discussionComment.findUnique({
      where: { id: commentId },
    }) as any;

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Users can delete their own comments, admins/facilitators can delete any
    if (comment.userId !== userId && userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
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

  async toggleCommentPin(commentId: string, userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException('Only admins and facilitators can pin comments');
    }

    const comment = await this.prisma.discussionComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isPinned = !!(comment as any).isPinned;

    return (this.prisma as any).discussionComment.update({
      where: { id: commentId },
      data: { isPinned: !isPinned },
    });
  }

  async reactToComment(commentId: string, userId: string, type: string) {
    const comment = await this.prisma.discussionComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await (this.prisma as any).discussionCommentReaction.findUnique({
      where: {
        commentId_userId_type: {
          commentId,
          userId,
          type: type as any,
        },
      },
    }) as any;

    if (existing) {
      await (this.prisma as any).discussionCommentReaction.delete({
        where: { id: existing.id },
      });
      return { reacted: false };
    }

    await (this.prisma as any).discussionCommentReaction.create({
      data: {
        commentId,
        userId,
        type: type as any,
      },
    });

    return { reacted: true };
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

  async getDiscussionTopics(cohortId: string) {
    if (!cohortId) {
      throw new BadRequestException('Cohort is required');
    }

    const sessions = await this.prisma.session.findMany({
      where: { cohortId },
      orderBy: { sessionNumber: 'asc' },
      select: { id: true, sessionNumber: true, title: true },
    });

    const resources = await this.prisma.resource.findMany({
      where: { session: { cohortId } },
      orderBy: [{ sessionId: 'asc' }, { order: 'asc' }],
      select: { id: true, title: true, session: { select: { sessionNumber: true, title: true } } },
    });

    return [
      { type: 'GENERAL', value: 'general', label: 'General' },
      ...sessions.map((session) => ({
        type: 'SESSION',
        value: session.id,
        label: `Session ${session.sessionNumber}: ${session.title}`,
      })),
      ...resources.map((resource) => ({
        type: 'RESOURCE',
        value: resource.id,
        label: `Resource: ${resource.title} (Session ${resource.session.sessionNumber})`,
      })),
    ];
  }

  // ==================== ADMIN METHODS ====================

  async togglePin(discussionId: string, userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException('Only admins and facilitators can pin discussions');
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
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException('Only admins and facilitators can lock discussions');
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
