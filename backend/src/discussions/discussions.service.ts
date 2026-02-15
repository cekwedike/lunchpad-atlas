import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateDiscussionDto,
  CreateCommentDto,
  DiscussionFilterDto,
  DiscussionTopicType,
} from './dto/discussion.dto';
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

  private stripHtmlToText(html: string) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private stripTranscriptToText(transcript: string) {
    return transcript
      .replace(/\r/g, '')
      .replace(/^WEBVTT[\s\S]*?\n\n/, '')
      .split('\n')
      .filter((line) => !/-->/.test(line) && !/^\d+$/.test(line))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async fetchResourceContent(url: string, type?: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ATLAS-ScoringBot/1.0',
        },
      });

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      const raw = await response.text();
      const limited = raw.slice(0, 20000);

      if (type === 'VIDEO' && /text\/vtt|application\/x-subrip/i.test(contentType)) {
        return this.stripTranscriptToText(limited);
      }

      if (contentType.includes('text/html')) {
        return this.stripHtmlToText(limited);
      }

      if (contentType.includes('text/plain')) {
        return limited.replace(/\s+/g, ' ').trim();
      }

      return null;
    } catch (error) {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async getResourceSummary(resource: {
    id: string;
    title: string;
    type?: string | null;
    url?: string | null;
    aiSummary?: string | null;
    aiSummaryUpdatedAt?: Date | null;
  }) {
    if (!resource.url) return null;

    if (resource.aiSummary && resource.aiSummaryUpdatedAt) {
      const ageMs = Date.now() - resource.aiSummaryUpdatedAt.getTime();
      const maxAgeMs = 1000 * 60 * 60 * 24 * 30;
      if (ageMs < maxAgeMs) {
        return resource.aiSummary;
      }
    }

    const fetchableTypes = new Set(['ARTICLE', 'EXERCISE', 'VIDEO']);
    if (resource.type && !fetchableTypes.has(resource.type)) {
      return null;
    }

    let content: string | null = null;

    if (resource.type === 'VIDEO') {
      const urlLower = resource.url.toLowerCase();
      if (urlLower.endsWith('.vtt') || urlLower.endsWith('.srt')) {
        content = await this.fetchResourceContent(resource.url, 'VIDEO');
      }
    } else {
      content = await this.fetchResourceContent(resource.url, resource.type || undefined);
    }

    if (!content) return null;

    const summaryResult = await this.discussionScoring.summarizeResourceContent(
      resource.title,
      content,
      resource.type || undefined,
    );

    const summaryParts = [summaryResult.summary];
    if (summaryResult.keyPoints.length) {
      summaryParts.push(`Key Points: ${summaryResult.keyPoints.join('; ')}`);
    }

    const summary = summaryParts.filter(Boolean).join('\n');

    await this.prisma.resource.update({
      where: { id: resource.id },
      data: {
        aiSummary: summary,
        aiSummaryUpdatedAt: new Date(),
      },
    });

    return summary;
  }

  /**
   * Helper function to award points — enforces the shared monthly cap.
   */
  private async awardPoints(
    userId: string,
    points: number,
    eventType: string,
    description: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentMonthPoints: true,
        monthlyPointsCap: true,
        lastPointReset: true,
      },
    });

    if (!user) return false;

    // Check if monthly reset is needed
    const now = new Date();
    const lastReset = user.lastPointReset;
    const needsReset =
      !lastReset ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    const currentMonthPoints = needsReset ? 0 : user.currentMonthPoints;

    // Enforce monthly cap
    if (currentMonthPoints + points > user.monthlyPointsCap) {
      return false;
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentMonthPoints: needsReset ? points : { increment: points },
        lastPointReset: needsReset ? now : undefined,
      },
    });

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

  private maskDiscussionQuality<T extends { isQualityVisible?: boolean }>(
    discussion: T,
    userRole: string,
  ): T {
    if (userRole === 'FELLOW' && !discussion.isQualityVisible) {
      return {
        ...discussion,
        qualityScore: null,
        qualityAnalysis: null,
        scoredAt: null,
      } as T;
    }

    return discussion;
  }

  private maskCommentQuality<T extends { isQualityVisible?: boolean }>(
    comment: T,
    userRole: string,
  ): T {
    if (userRole === 'FELLOW' && !comment.isQualityVisible) {
      return {
        ...comment,
        qualityScore: null,
        qualityAnalysis: null,
        scoredAt: null,
      } as T;
    }

    return comment;
  }

  private async assertCanScoreQuality(
    userId: string,
    userRole: string,
    cohortId: string,
  ) {
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException(
        'Only admins and facilitators can score quality',
      );
    }

    if (userRole === 'FACILITATOR') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });

      if (!user?.cohortId || user.cohortId !== cohortId) {
        throw new ForbiddenException(
          'Facilitators can only score content for their cohort',
        );
      }
    }
  }

  async createDiscussion(
    userId: string,
    userRole: string,
    dto: CreateDiscussionDto,
  ) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true },
    });

    // Get user's cohortId if not provided
    let cohortId = dto.cohortId || user?.cohortId || '';

    if (userRole === 'FACILITATOR' && user?.cohortId && cohortId !== user.cohortId) {
      throw new ForbiddenException(
        'Facilitators can only create discussions for their cohort',
      );
    }

    if (userRole === 'FELLOW' && user?.cohortId && cohortId !== user.cohortId) {
      throw new ForbiddenException(
        'Fellows can only create discussions for their cohort',
      );
    }

    if (!cohortId) {
      throw new BadRequestException(
        'Cohort is required to create a discussion',
      );
    }

    // ── Enforce 100-word minimum for discussion content ───────────────────
    const plainText = this.stripHtmlToText(dto.content);
    const wordCount = plainText.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount < 100) {
      throw new BadRequestException(
        `Discussion content must be at least 100 words. Current word count: ${wordCount}.`,
      );
    }

    const topicType: DiscussionTopicType =
      dto.topicType ||
      (dto.resourceId ? 'RESOURCE' : dto.sessionId ? 'SESSION' : 'GENERAL');

    let resourceId: string | undefined;
    let sessionId: string | undefined;

    if (topicType === 'RESOURCE') {
      if (!dto.resourceId) {
        throw new BadRequestException(
          'Resource is required for a resource discussion',
        );
      }

      const resource = await this.prisma.resource.findUnique({
        where: { id: dto.resourceId },
        select: {
          id: true,
          sessionId: true,
          session: { select: { cohortId: true } },
        },
      });

      if (!resource || resource.session?.cohortId !== cohortId) {
        throw new NotFoundException('Resource not found for this cohort');
      }

      resourceId = resource.id;
      sessionId = resource.sessionId;
    }

    if (topicType === 'SESSION') {
      if (!dto.sessionId) {
        throw new BadRequestException(
          'Session is required for a session topic',
        );
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

    const isApproved = userRole !== 'FELLOW';
    const discussion = (await this.prisma.discussion.create({
      data: {
        title: dto.title,
        content: dto.content,
        userId: userId,
        cohortId: cohortId,
        resourceId: resourceId ?? null,
        sessionId: sessionId ?? null,
        isApproved,
        approvedAt: isApproved ? new Date() : null,
        approvedById: isApproved ? userId : null,
      } as any,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        resource: {
          select: { id: true, title: true },
        },
      } as any,
    })) as any;

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

    // Award 5 points for creating a discussion — but only if the user has already
    // commented on at least one discussion by someone else (mandatory peer engagement).
    const peerCommentCount = await this.prisma.discussionComment.count({
      where: {
        userId,
        discussion: { userId: { not: userId } }, // comment on someone else's discussion
      },
    });
    const hasPeerEngaged = peerCommentCount > 0;

    const awarded = hasPeerEngaged
      ? await this.awardPoints(userId, 5, 'DISCUSSION_POST', `Posted discussion: ${dto.title}`)
      : false;

    if (isApproved) {
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
    }

    return {
      ...discussionWithTopic,
      pointsAwarded: awarded ? 5 : 0,
      cappedMessage: awarded ? null : 'Monthly point cap reached',
    };
  }

  async getDiscussions(
    filters: DiscussionFilterDto,
    userRole: string,
    userId: string,
  ) {
    const {
      page = 1,
      limit = 10,
      search,
      cohortId,
      resourceId,
      authorId,
      isPinned,
      isApproved,
    } = filters as any;
    const skip = (page - 1) * limit;

    const where: any = {};
    const andFilters: any[] = [];

    if (search) {
      andFilters.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (cohortId) where.cohortId = cohortId;
    if (resourceId) where.resourceId = resourceId;
    if (authorId) where.authorId = authorId;
    if (isPinned !== undefined) where.isPinned = isPinned;

    const parsedIsApproved =
      typeof isApproved === 'string' ? isApproved === 'true' : isApproved;

    if (parsedIsApproved !== undefined) {
      if (userRole === 'FELLOW' && parsedIsApproved === false) {
        andFilters.push({ isApproved: false, userId: userId });
      } else {
        andFilters.push({ isApproved: parsedIsApproved });
      }
    }

    if (userRole === 'FELLOW') {
      andFilters.push({
        OR: [{ isApproved: true }, { userId: userId }],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const [discussions, total] = await Promise.all([
      this.prisma.discussion.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
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
      new Set(
        discussions
          .map((discussion) => (discussion as any).sessionId)
          .filter(Boolean),
      ),
    ) as string[];
    const sessions = sessionIds.length
      ? await this.prisma.session.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, sessionNumber: true, title: true },
        })
      : [];
    const sessionMap = new Map(
      sessions.map((session) => [session.id, session]),
    );
    const discussionsWithTopics = discussions.map((discussion) => {
      const discussionSessionId = (discussion as any).sessionId as
        | string
        | undefined
        | null;
      const withSession = {
        ...discussion,
        session: discussionSessionId
          ? sessionMap.get(discussionSessionId) || null
          : null,
      };
      return this.maskDiscussionQuality(withSession, userRole);
    });

    return {
      data: discussionsWithTopics,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAiStatus(userRole: string) {
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Only admins can view AI status');
    }

    return this.discussionScoring.getAiStatus();
  }

  async getPendingApprovalCount(
    userId: string,
    userRole: string,
    cohortId?: string,
  ) {
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException(
        'Only admins and facilitators can view pending approvals',
      );
    }

    let scopedCohortId = cohortId;

    if (userRole === 'FACILITATOR') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });

      if (!user?.cohortId) {
        return { count: 0 };
      }

      scopedCohortId = user.cohortId;
    }

    const where: any = {
      isApproved: false,
    };

    if (scopedCohortId) {
      where.cohortId = scopedCohortId;
    }

    const count = await this.prisma.discussion.count({ where });

    return { count };
  }

  async getDiscussion(id: string, userRole: string, userId: string) {
    const discussion = (await this.prisma.discussion.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        resource: {
          select: { id: true, title: true },
        },
        _count: {
          select: { comments: true, likes: true },
        },
      } as any,
    })) as any;

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (userRole === 'FELLOW' && !discussion.isApproved && discussion.userId !== userId) {
      throw new ForbiddenException('Discussion is pending approval');
    }

    const sessionId = discussion.sessionId as string | undefined | null;
    const session = sessionId
      ? await this.prisma.session.findUnique({
          where: { id: sessionId },
          select: { id: true, sessionNumber: true, title: true },
        })
      : null;

    return this.maskDiscussionQuality(
      {
        ...discussion,
        session,
      },
      userRole,
    );
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
      const discussion = await this.prisma.discussion.findUnique({
        where: { id: discussionId },
        select: { cohortId: true },
      });

      if (discussion?.cohortId) {
        this.discussionsGateway.broadcastDiscussionLiked(
          discussionId,
          discussion.cohortId,
        );
      }

      return { liked: false };
    }

    await this.prisma.discussionLike.create({
      data: { discussionId, userId },
    });

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { cohortId: true },
    });

    if (discussion?.cohortId) {
      this.discussionsGateway.broadcastDiscussionLiked(
        discussionId,
        discussion.cohortId,
      );
    }

    return { liked: true };
  }

  async getComments(discussionId: string, userId: string, userRole: string) {
    const comments = (await (this.prisma as any).discussionComment.findMany({
      where: { discussionId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        reactions: {
          select: { id: true, userId: true, type: true },
        },
      },
    })) as any[];

    return comments.map((comment) => {
      const reactionCounts = (comment.reactions || []).reduce(
        (acc: Record<string, number>, reaction: any) => {
          acc[reaction.type] = (acc[reaction.type] || 0) + 1;
          return acc;
        },
        {},
      );

      const userReactions = (comment.reactions || [])
        .filter((reaction: any) => reaction.userId === userId)
        .map((reaction: any) => reaction.type);

      return this.maskCommentQuality(
        {
          ...comment,
          reactionCounts,
          userReactions,
        },
        userRole,
      );
    });
  }

  async createComment(
    discussionId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      select: {
        id: true,
        title: true,
        userId: true,
        isLocked: true,
        isApproved: true,
        cohortId: true,
        resourceId: true,
      },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Check if discussion is locked
    if (discussion.isLocked) {
      throw new ForbiddenException(
        'This discussion is locked. No new comments allowed.',
      );
    }

    if (!discussion.isApproved) {
      throw new ForbiddenException('Discussion is pending approval');
    }

    if (dto.parentId) {
      const parentComment = await this.prisma.discussionComment.findUnique({
        where: { id: dto.parentId },
        select: { id: true, discussionId: true },
      });

      if (!parentComment || parentComment.discussionId !== discussionId) {
        throw new BadRequestException(
          'Parent comment does not belong to this discussion',
        );
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        reactions: {
          select: { id: true, userId: true, type: true },
        },
      },
    });

    // Award 2 points for replying — but only for the first 3 comments per resource.
    // Comments on general/session discussions (no resourceId) are always eligible.
    let awarded = false;
    const discussionResourceId = (discussion as any).resourceId as string | null;

    let withinResourceCap = true;
    if (discussionResourceId) {
      // Count existing comments by this user on discussions linked to the same resource
      const priorResourceComments = await this.prisma.discussionComment.count({
        where: {
          userId,
          discussion: { resourceId: discussionResourceId },
          id: { not: comment.id }, // exclude the one we just created
        },
      });
      withinResourceCap = priorResourceComments < 3;
    }

    if (withinResourceCap) {
      awarded = await this.awardPoints(
        userId,
        2,
        'DISCUSSION_COMMENT',
        `Commented on discussion: ${discussion.title}`,
      );
    }

    // If this is the user's FIRST peer comment (commenting on someone else's discussion),
    // retroactively award points for any own discussions that were withheld.
    const isPeerComment = discussion.userId !== userId;
    if (isPeerComment) {
      const prevPeerComments = await this.prisma.discussionComment.count({
        where: {
          userId,
          discussion: { userId: { not: userId } },
          id: { not: comment.id }, // exclude the one we just created
        },
      });
      // Only on first peer comment (count was 0 before this one)
      if (prevPeerComments === 0) {
        const unawarded = await this.prisma.discussion.findMany({
          where: { userId, isApproved: true },
          select: { id: true, title: true },
        });
        for (const d of unawarded) {
          const alreadyAwarded = await this.prisma.pointsLog.count({
            where: { userId, eventType: 'DISCUSSION_POST', description: { contains: d.title } },
          });
          if (!alreadyAwarded) {
            await this.awardPoints(userId, 5, 'DISCUSSION_POST', `Posted discussion: ${d.title} (peer engagement unlocked)`);
          }
        }
      }
    }

    // Broadcast new comment to discussion participants in real-time
    try {
      this.discussionsGateway.broadcastNewComment(
        comment,
        discussionId,
        discussion.cohortId,
      );
    } catch (error) {
      console.error('Failed to broadcast comment:', error);
    }

    // Notify discussion author
    try {
      if (discussion.userId !== userId) {
        const commenterName =
          `${comment.user?.firstName || ''} ${comment.user?.lastName || ''}`.trim();
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

      if (dto.parentId) {
        const parentComment = await this.prisma.discussionComment.findUnique({
          where: { id: dto.parentId },
          select: { userId: true },
        });

        if (parentComment?.userId && parentComment.userId !== userId) {
          const commenterName =
            `${comment.user?.firstName || ''} ${comment.user?.lastName || ''}`.trim();
          await this.notificationsService.notifyDiscussionReply(
            parentComment.userId,
            commenterName,
            discussion.title,
            discussionId,
          );
        }
      }
    } catch (error) {
      console.error('Failed to send comment notifications:', error);
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
    if (
      discussion.userId !== userId &&
      userRole !== 'ADMIN' &&
      userRole !== 'FACILITATOR'
    ) {
      throw new ForbiddenException(
        'Only administrators and facilitators can delete discussions',
      );
    }

    await this.prisma.discussion.delete({ where: { id } });

    if (discussion.cohortId) {
      this.discussionsGateway.broadcastDiscussionDeleted(
        discussion.id,
        discussion.cohortId,
      );
    }
    return { message: 'Discussion deleted successfully' };
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await (this.prisma as any).discussionComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Users can delete their own comments, admins/facilitators can delete any
    if (
      comment.userId !== userId &&
      userRole !== 'ADMIN' &&
      userRole !== 'FACILITATOR'
    ) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.discussionComment.delete({ where: { id: commentId } });

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: comment.discussionId },
      select: { cohortId: true },
    });

    if (discussion?.cohortId) {
      this.discussionsGateway.broadcastCommentDeleted(
        comment.discussionId,
        commentId,
        discussion.cohortId,
      );
    }
    return { message: 'Comment deleted successfully' };
  }

  async updateComment(
    commentId: string,
    userId: string,
    dto: CreateCommentDto,
  ) {
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: comment.discussionId },
      select: { cohortId: true },
    });

    if (discussion?.cohortId) {
      this.discussionsGateway.broadcastCommentUpdated(
        comment.discussionId,
        updated,
        discussion.cohortId,
      );
    }

    return updated;
  }

  async toggleCommentPin(commentId: string, userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException(
        'Only admins and facilitators can pin comments',
      );
    }

    const comment = await this.prisma.discussionComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const isPinned = !!(comment as any).isPinned;

    const updated = await (this.prisma as any).discussionComment.update({
      where: { id: commentId },
      data: { isPinned: !isPinned },
    });

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: comment.discussionId },
      select: { cohortId: true },
    });

    if (discussion?.cohortId) {
      this.discussionsGateway.broadcastCommentUpdated(
        comment.discussionId,
        updated,
        discussion.cohortId,
      );
    }

    return updated;
  }

  async reactToComment(commentId: string, userId: string, type: string) {
    const comment = await this.prisma.discussionComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existing = await (
      this.prisma as any
    ).discussionCommentReaction.findUnique({
      where: {
        commentId_userId_type: {
          commentId,
          userId,
          type: type as any,
        },
      },
    });

    if (existing) {
      await (this.prisma as any).discussionCommentReaction.delete({
        where: { id: existing.id },
      });
      const discussion = await this.prisma.discussion.findUnique({
        where: { id: comment.discussionId },
        select: { cohortId: true },
      });

      if (discussion?.cohortId) {
        this.discussionsGateway.broadcastCommentReacted(
          comment.discussionId,
          commentId,
          discussion.cohortId,
        );
      }
      return { reacted: false };
    }

    await (this.prisma as any).discussionCommentReaction.create({
      data: {
        commentId,
        userId,
        type: type as any,
      },
    });

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: comment.discussionId },
      select: { cohortId: true },
    });

    if (discussion?.cohortId) {
      this.discussionsGateway.broadcastCommentReacted(
        comment.discussionId,
        commentId,
        discussion.cohortId,
      );
    }

    return { reacted: true };
  }

  // AI Quality Scoring
  async scoreDiscussionQuality(
    discussionId: string,
    userId: string,
    userRole: string,
  ) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            description: true,
            url: true,
            type: true,
            aiSummary: true,
            aiSummaryUpdatedAt: true,
          },
        },
        session: {
          select: { title: true, description: true, monthTheme: true },
        },
        user: {
          select: { id: true, role: true },
        },
      },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    await this.assertCanScoreQuality(userId, userRole, discussion.cohortId);

    if (!discussion.isApproved) {
      throw new BadRequestException('Discussion must be approved before scoring');
    }

    if (discussion.user?.role !== 'FELLOW') {
      throw new BadRequestException('Only fellow discussions are scored');
    }

    const contextParts: string[] = [];

    if (discussion.session) {
      contextParts.push(
        `Session: ${discussion.session.title}` +
          (discussion.session.description
            ? ` - ${discussion.session.description}`
            : ''),
      );
      if (discussion.session.monthTheme) {
        contextParts.push(`Theme: ${discussion.session.monthTheme}`);
      }
    }

    if (discussion.resource) {
      contextParts.push(
        `Resource: ${discussion.resource.title}` +
          (discussion.resource.description
            ? ` - ${discussion.resource.description}`
            : ''),
      );
      const resourceSummary = await this.getResourceSummary(discussion.resource);
      if (resourceSummary) {
        contextParts.push(`Resource Summary: ${resourceSummary}`);
      }
      if (discussion.resource.url) {
        contextParts.push(`Resource URL: ${discussion.resource.url}`);
      }
      if (discussion.resource.type) {
        contextParts.push(`Resource Type: ${discussion.resource.type}`);
      }
    }

    const resourceContext = contextParts.length ? contextParts.join('\n') : undefined;

    let analysis;

    try {
      analysis = await this.discussionScoring.scoreDiscussion(
        discussion.title,
        discussion.content,
        resourceContext,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini analysis failed';
      throw new BadRequestException(message);
    }

    // Update discussion with quality score
    const updated = await this.prisma.discussion.update({
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

    const discussionScore = Math.max(0, Math.min(100, analysis.score));
    const scoreDescription = `Quality score for discussion ${discussionId}`;

    await this.prisma.pointsLog.deleteMany({
      where: {
        userId: discussion.userId,
        eventType: 'DISCUSSION_QUALITY_SCORE' as any,
        description: scoreDescription,
      },
    });

    await this.awardPoints(
      discussion.userId,
      discussionScore,
      'DISCUSSION_QUALITY_SCORE',
      scoreDescription,
    );

    this.discussionsGateway.broadcastDiscussionUpdate(updated);

    return updated;
  }

  async toggleDiscussionQualityVisibility(
    discussionId: string,
    userId: string,
    userRole: string,
  ) {
    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      select: { id: true, isQualityVisible: true, cohortId: true },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    await this.assertCanScoreQuality(userId, userRole, discussion.cohortId);

    const updated = await this.prisma.discussion.update({
      where: { id: discussionId },
      data: { isQualityVisible: !discussion.isQualityVisible },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    this.discussionsGateway.broadcastDiscussionUpdate(updated);

    return updated;
  }

  async scoreCommentQuality(
    commentId: string,
    userId: string,
    userRole: string,
  ) {
    const comment = await (this.prisma as any).discussionComment.findUnique({
      where: { id: commentId },
      include: {
        discussion: {
          select: {
            id: true,
            cohortId: true,
            title: true,
            content: true,
            isApproved: true,
            session: {
              select: { title: true, description: true, monthTheme: true },
            },
            resource: {
              select: {
                id: true,
                title: true,
                description: true,
                url: true,
                type: true,
                aiSummary: true,
                aiSummaryUpdatedAt: true,
              },
            },
            user: { select: { id: true, role: true } },
          },
        },
        user: { select: { id: true, role: true } },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.assertCanScoreQuality(
      userId,
      userRole,
      comment.discussion.cohortId,
    );

    if (!comment.discussion.isApproved) {
      throw new BadRequestException('Discussion must be approved before scoring');
    }

    if (comment.user?.role !== 'FELLOW') {
      throw new BadRequestException('Only fellow comments are scored');
    }

    const commentContextParts: string[] = [];

    if (comment.discussion.session) {
      commentContextParts.push(
        `Session: ${comment.discussion.session.title}` +
          (comment.discussion.session.description
            ? ` - ${comment.discussion.session.description}`
            : ''),
      );
      if (comment.discussion.session.monthTheme) {
        commentContextParts.push(`Theme: ${comment.discussion.session.monthTheme}`);
      }
    }

    if (comment.discussion.resource) {
      commentContextParts.push(
        `Resource: ${comment.discussion.resource.title}` +
          (comment.discussion.resource.description
            ? ` - ${comment.discussion.resource.description}`
            : ''),
      );
      const commentResourceSummary = await this.getResourceSummary(
        comment.discussion.resource,
      );
      if (commentResourceSummary) {
        commentContextParts.push(`Resource Summary: ${commentResourceSummary}`);
      }
      if (comment.discussion.resource.url) {
        commentContextParts.push(`Resource URL: ${comment.discussion.resource.url}`);
      }
      if (comment.discussion.resource.type) {
        commentContextParts.push(`Resource Type: ${comment.discussion.resource.type}`);
      }
    }

    const learningContext = commentContextParts.length
      ? commentContextParts.join('\n')
      : undefined;

    let analysis;

    try {
      analysis = await this.discussionScoring.scoreComment(
        comment.content,
        comment.discussion.title,
        comment.discussion.content,
        learningContext,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini analysis failed';
      throw new BadRequestException(message);
    }

    const updated = await (this.prisma as any).discussionComment.update({
      where: { id: commentId },
      data: {
        qualityScore: analysis.score,
        qualityAnalysis: analysis as any,
        scoredAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const commentScore = Math.max(0, Math.min(100, analysis.score));
    const commentScoreDescription = `Quality score for comment ${commentId}`;

    await this.prisma.pointsLog.deleteMany({
      where: {
        userId: comment.userId,
        eventType: 'COMMENT_QUALITY_SCORE' as any,
        description: commentScoreDescription,
      },
    });

    await this.awardPoints(
      comment.userId,
      commentScore,
      'COMMENT_QUALITY_SCORE',
      commentScoreDescription,
    );

    if (comment.discussion?.cohortId) {
      this.discussionsGateway.broadcastCommentUpdated(
        comment.discussion.id,
        updated,
        comment.discussion.cohortId,
      );
    }

    return updated;
  }

  async toggleCommentQualityVisibility(
    commentId: string,
    userId: string,
    userRole: string,
  ) {
    const comment = await (this.prisma as any).discussionComment.findUnique({
      where: { id: commentId },
      include: {
        discussion: {
          select: { id: true, cohortId: true },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.assertCanScoreQuality(
      userId,
      userRole,
      comment.discussion.cohortId,
    );

    const updated = await (this.prisma as any).discussionComment.update({
      where: { id: commentId },
      data: { isQualityVisible: !comment.isQualityVisible },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (comment.discussion?.cohortId) {
      this.discussionsGateway.broadcastCommentUpdated(
        comment.discussion.id,
        updated,
        comment.discussion.cohortId,
      );
    }

    return updated;
  }

  async approveDiscussion(
    discussionId: string,
    userId: string,
    userRole: string,
  ) {
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException(
        'Only admins and facilitators can approve discussions',
      );
    }

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (userRole === 'FACILITATOR') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });

      if (!user?.cohortId || user.cohortId !== discussion.cohortId) {
        throw new ForbiddenException(
          'Facilitators can only approve discussions for their cohort',
        );
      }
    }

    if (discussion.isApproved) {
      return discussion;
    }

    const updated = await this.prisma.discussion.update({
      where: { id: discussionId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedById: userId,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        resource: { select: { id: true, title: true } },
      },
    });

    this.discussionsGateway.broadcastNewDiscussion(updated);
    this.discussionsGateway.broadcastDiscussionUpdate(updated);

    await this.notificationsService.notifyDiscussionApproved(
      discussion.userId,
      discussion.title,
      discussion.id,
    );

    return updated;
  }

  async getHighQualityDiscussions(cohortId?: string, limit: number = 10) {
    const where: any = {
      qualityScore: { gte: 70 },
      isApproved: true,
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
      select: {
        id: true,
        title: true,
        session: { select: { sessionNumber: true, title: true } },
      },
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

  async togglePin(discussionId: string, userId: string, userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException(
        'Only admins and facilitators can pin discussions',
      );
    }

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (userRole === 'FACILITATOR') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });

      if (!user?.cohortId || user.cohortId !== discussion.cohortId) {
        throw new ForbiddenException(
          'Facilitators can only pin discussions for their cohort',
        );
      }
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

  async toggleLock(discussionId: string, userId: string, userRole: string) {
    if (userRole !== 'ADMIN' && userRole !== 'FACILITATOR') {
      throw new ForbiddenException(
        'Only admins and facilitators can lock discussions',
      );
    }

    const discussion = await this.prisma.discussion.findUnique({
      where: { id: discussionId },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    if (userRole === 'FACILITATOR') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { cohortId: true },
      });

      if (!user?.cohortId || user.cohortId !== discussion.cohortId) {
        throw new ForbiddenException(
          'Facilitators can only lock discussions for their cohort',
        );
      }
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
      where: { isApproved: true },
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
