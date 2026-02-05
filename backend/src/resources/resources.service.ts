import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ResourceQueryDto, TrackEngagementDto } from './dto/resource.dto';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class ResourcesService {
  constructor(
    private prisma: PrismaService,
    private achievementsService: AchievementsService
  ) {}

  /**
   * Helper function to award points with monthly cap enforcement
   * Returns true if points were awarded, false if cap reached
   */
  private async awardPoints(
    userId: string,
    points: number,
    eventType: string,
    description: string
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
    const needsReset = !lastReset || 
      lastReset.getMonth() !== now.getMonth() || 
      lastReset.getFullYear() !== now.getFullYear();

    let currentMonthPoints = user.currentMonthPoints;
    if (needsReset) {
      currentMonthPoints = 0;
    }

    // Check if user would exceed monthly cap
    if (currentMonthPoints + points > user.monthlyPointsCap) {
      return false; // Cap reached, no points awarded
    }

    // Award points
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: { increment: points },
        currentMonthPoints: needsReset ? points : { increment: points },
        lastPointReset: needsReset ? now : undefined,
      },
    });

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

  /**
   * Calculate if a resource is unlocked based on session unlock date
   * Resources unlock 6 days before session scheduled date
   * Facilitators get early access (always unlocked)
   */
  private async calculateResourceState(
    resourceId: string,
    userId: string,
    session?: any,
    userRole?: string
  ): Promise<'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED'> {
    // Check user progress first
    const progress = await this.prisma.resourceProgress.findUnique({
      where: { userId_resourceId: { userId, resourceId } },
    });

    if (progress) {
      return progress.state;
    }

    // Facilitators and admins always have access
    if (userRole === 'FACILITATOR' || userRole === 'ADMIN') {
      return 'UNLOCKED';
    }

    // Check if resource is unlocked based on session date
    if (!session) {
      const resource = await this.prisma.resource.findUnique({
        where: { id: resourceId },
        include: { session: true },
      });
      session = resource?.session;
    }

    if (!session) {
      return 'LOCKED';
    }

    const now = new Date();
    const unlockDate = new Date(session.unlockDate);

    return now >= unlockDate ? 'UNLOCKED' : 'LOCKED';
  }

  async getResources(userId: string, query: ResourceQueryDto) {
    const { type, sessionId, search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // Get user role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

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
          session: true,
          progress: {
            where: { userId },
          },
        },
        orderBy: { order: 'asc' },
      }),
      this.prisma.resource.count({ where }),
    ]);

    // Calculate state for each resource
    const resourcesWithState = await Promise.all(
      resources.map(async (r) => {
        const state = await this.calculateResourceState(
          r.id,
          userId,
          r.session,
          user?.role
        );

        return {
          ...r,
          state,
          completedAt: r.progress[0]?.completedAt,
          progress: undefined, // Remove progress array from response
        };
      })
    );

    return {
      data: resourcesWithState,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getResourceById(resourceId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        session: true,
        progress: {
          where: { userId },
        },
      },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    const state = await this.calculateResourceState(
      resourceId,
      userId,
      resource.session,
      user?.role
    );

    // Check if user can access this resource
    if (state === 'LOCKED') {
      const unlockDate = new Date(resource.session.unlockDate);
      throw new ForbiddenException(
        `Resource is locked. It will unlock on ${unlockDate.toISOString()}`
      );
    }

    return {
      ...resource,
      state,
      completedAt: resource.progress[0]?.completedAt || null,
      progress: undefined,
    };
  }

  async markComplete(resourceId: string, userId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Get current progress to check engagement metrics
    const existingProgress = await this.prisma.resourceProgress.findUnique({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
    });

    // ANTI-SKIMMING VALIDATION
    // Validate engagement thresholds before allowing completion
    if (existingProgress) {
      const validationErrors: string[] = [];

      // For articles: scrollDepth must be >= 80%
      if (resource.type === 'ARTICLE' && existingProgress.scrollDepth < 80) {
        validationErrors.push(
          `Article requires 80% scroll depth. Current: ${existingProgress.scrollDepth}%`
        );
      }

      // For videos: watchPercentage must be >= 85%
      if (resource.type === 'VIDEO' && existingProgress.watchPercentage < 85) {
        validationErrors.push(
          `Video requires 85% watch completion. Current: ${existingProgress.watchPercentage}%`
        );
      }

      // For all types: check if minimum time threshold is met
      // minimumThresholdMet is calculated by engagement tracking endpoint
      // based on timeSpent >= 70% of estimatedMinutes
      if (!existingProgress.minimumThresholdMet) {
        const requiredMinutes = Math.ceil(resource.estimatedMinutes * 0.7);
        validationErrors.push(
          `Must spend at least ${requiredMinutes} minutes (70% of ${resource.estimatedMinutes} min estimated time)`
        );
      }

      // If validation fails, throw error with specific feedback
      if (validationErrors.length > 0) {
        throw new ForbiddenException({
          message: 'Insufficient engagement to complete resource',
          errors: validationErrors,
          hint: 'Please engage more thoroughly with the content before marking complete',
        });
      }
    } else {
      // No progress tracked yet - user tried to mark complete without engaging
      throw new ForbiddenException(
        'Must engage with resource before completing. Start reading/watching to track your progress.'
      );
    }

    const alreadyCompleted = existingProgress.state === 'COMPLETED';

    // Update progress to COMPLETED
    const progress = await this.prisma.resourceProgress.update({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
      data: {
        state: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Award points only if not already completed
    if (!alreadyCompleted) {
      // Calculate engagement quality bonus (0-20% extra points based on engagement quality)
      const qualityBonus = Math.floor(
        resource.pointValue * existingProgress.engagementQuality * 0.2
      );
      const totalPoints = resource.pointValue + qualityBonus;

      // Award points with monthly cap enforcement
      const awarded = await this.awardPoints(
        userId,
        totalPoints,
        'RESOURCE_COMPLETE',
        `Completed: ${resource.title}${qualityBonus > 0 ? ` (Quality bonus: +${qualityBonus})` : ''}`
      );

      // Check and award achievements
      const newAchievements = await this.achievementsService.checkAndAwardAchievements(userId);

      return {
        ...progress,
        pointsAwarded: awarded ? totalPoints : 0,
        cappedMessage: awarded ? null : 'Monthly point cap reached - no points awarded',
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
      };
    }

    return progress;
  }

  /**
   * Track user engagement events (scroll, video progress, time tracking)
   * Updates ResourceProgress with real-time metrics
   * Calculates engagement quality and minimum time threshold
   */
  async trackEngagement(
    resourceId: string,
    userId: string,
    dto: TrackEngagementDto
  ) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Get or create progress record
    let progress = await this.prisma.resourceProgress.findUnique({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
    });

    if (!progress) {
      progress = await this.prisma.resourceProgress.create({
        data: {
          userId,
          resourceId,
          state: 'IN_PROGRESS',
        },
      });
    }

    // Log the engagement event
    await this.prisma.engagementEvent.create({
      data: {
        userId,
        resourceId,
        eventType: dto.eventType || 'interaction',
        scrollDepth: dto.scrollDepth,
        watchPercentage: dto.watchPercentage,
        timeSpent: dto.timeSpent,
        metadata: dto.metadata,
      },
    });

    // Calculate updated metrics
    const updateData: any = {};

    // Update scroll depth (max value)
    if (dto.scrollDepth !== undefined) {
      updateData.scrollDepth = Math.max(progress.scrollDepth, dto.scrollDepth);
    }

    // Update watch percentage (max value)
    if (dto.watchPercentage !== undefined) {
      updateData.watchPercentage = Math.max(
        progress.watchPercentage,
        dto.watchPercentage
      );
    }

    // Update time spent (cumulative - take latest from frontend)
    if (dto.timeSpent !== undefined) {
      updateData.timeSpent = dto.timeSpent;

      // Check if minimum time threshold is met (70% of estimated)
      const requiredSeconds = resource.estimatedMinutes * 60 * 0.7;
      updateData.minimumThresholdMet = dto.timeSpent >= requiredSeconds;
    }

    // Calculate engagement quality (0.0 to 1.0)
    // Based on scroll/watch depth and time spent relative to estimated
    let qualityScore = 0;

    if (resource.type === 'ARTICLE') {
      const scrollScore = (updateData.scrollDepth || progress.scrollDepth) / 100;
      const timeScore = Math.min(
        (updateData.timeSpent || progress.timeSpent) /
          (resource.estimatedMinutes * 60),
        1
      );
      qualityScore = scrollScore * 0.6 + timeScore * 0.4;
    } else if (resource.type === 'VIDEO') {
      const watchScore =
        (updateData.watchPercentage || progress.watchPercentage) / 100;
      const timeScore = Math.min(
        (updateData.timeSpent || progress.timeSpent) /
          (resource.estimatedMinutes * 60),
        1
      );
      qualityScore = watchScore * 0.7 + timeScore * 0.3;
    } else {
      // For other types, base on time spent
      qualityScore = Math.min(
        (updateData.timeSpent || progress.timeSpent) /
          (resource.estimatedMinutes * 60),
        1
      );
    }

    updateData.engagementQuality = Math.round(qualityScore * 100) / 100; // Round to 2 decimals

    // Update progress record
    const updatedProgress = await this.prisma.resourceProgress.update({
      where: {
        userId_resourceId: {
          userId,
          resourceId,
        },
      },
      data: updateData,
    });

    return {
      message: 'Engagement tracked successfully',
      progress: updatedProgress,
      canComplete:
        updatedProgress.minimumThresholdMet &&
        (resource.type === 'ARTICLE'
          ? updatedProgress.scrollDepth >= 80
          : resource.type === 'VIDEO'
            ? updatedProgress.watchPercentage >= 85
            : true),
    };
  }
}
