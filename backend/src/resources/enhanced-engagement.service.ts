import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface EnhancedEngagementData {
  playbackSpeed: number;
  pauseCount: number;
  seekCount: number;
  attentionScore: number;
}

@Injectable()
export class EnhancedEngagementService {
  constructor(private prisma: PrismaService) {}

  async trackVideoEngagement(
    userId: string,
    resourceId: string,
    data: Partial<EnhancedEngagementData>
  ) {
    const progress = await this.prisma.resourceProgress.findUnique({
      where: {
        userId_resourceId: { userId, resourceId },
      },
    });

    if (!progress) {
      throw new Error('Progress record not found');
    }

    return await this.prisma.resourceProgress.update({
      where: {
        userId_resourceId: { userId, resourceId },
      },
      data: {
        playbackSpeed: data.playbackSpeed ?? progress.playbackSpeed,
        pauseCount: data.pauseCount !== undefined 
          ? progress.pauseCount + data.pauseCount 
          : progress.pauseCount,
        seekCount: data.seekCount !== undefined 
          ? progress.seekCount + data.seekCount 
          : progress.seekCount,
        attentionSpanScore: data.attentionScore ?? progress.attentionSpanScore,
        updatedAt: new Date(),
      },
    });
  }

  async calculateEngagementQuality(
    userId: string,
    resourceId: string
  ): Promise<number> {
    const progress = await this.prisma.resourceProgress.findUnique({
      where: {
        userId_resourceId: { userId, resourceId },
      },
      include: {
        resource: true,
      },
    });

    if (!progress) {
      return 0;
    }

    let qualityScore = 1.0;

    // Penalize abnormal playback speeds
    if (progress.playbackSpeed > 1.5) {
      qualityScore *= 0.7; // 30% penalty for > 1.5x speed
    } else if (progress.playbackSpeed > 2.0) {
      qualityScore *= 0.5; // 50% penalty for > 2x speed
    } else if (progress.playbackSpeed > 2.5) {
      qualityScore *= 0.3; // 70% penalty for > 2.5x speed
    }

    // Penalize excessive pausing (indicates distraction)
    const estimatedMinutes = progress.resource.estimatedMinutes || 10;
    const expectedPauses = Math.ceil(estimatedMinutes / 5); // ~1 pause per 5 minutes is normal
    if (progress.pauseCount > expectedPauses * 3) {
      qualityScore *= 0.8; // 20% penalty for excessive pausing
    }

    // Penalize excessive seeking (indicates skipping)
    const expectedSeeks = 2; // Reasonable amount of seeking
    if (progress.seekCount > expectedSeeks * 3) {
      qualityScore *= 0.7; // 30% penalty for excessive seeking
    }

    // Factor in attention span score (from periodic checks)
    qualityScore *= progress.attentionSpanScore;

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, qualityScore));
  }

  async generateEngagementReport(userId: string, sessionId?: string) {
    const where: any = { userId };
    
    if (sessionId) {
      where.resource = { sessionId };
    }

    const progressRecords = await this.prisma.resourceProgress.findMany({
      where,
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            type: true,
            sessionId: true,
          },
        },
      },
    });

    const report = {
      totalResources: progressRecords.length,
      completed: progressRecords.filter(p => p.state === 'COMPLETED').length,
      averagePlaybackSpeed: 0,
      totalPauses: 0,
      totalSeeks: 0,
      averageAttentionScore: 0,
      averageEngagementQuality: 0,
      flaggedResources: [] as any[],
      recommendations: [] as string[],
    };

    if (progressRecords.length === 0) {
      return report;
    }

    // Calculate averages
    const videoProgress = progressRecords.filter(p => p.resource.type === 'VIDEO');
    
    if (videoProgress.length > 0) {
      report.averagePlaybackSpeed = videoProgress.reduce((sum, p) => sum + p.playbackSpeed, 0) / videoProgress.length;
      report.totalPauses = videoProgress.reduce((sum, p) => sum + p.pauseCount, 0);
      report.totalSeeks = videoProgress.reduce((sum, p) => sum + p.seekCount, 0);
      report.averageAttentionScore = videoProgress.reduce((sum, p) => sum + p.attentionSpanScore, 0) / videoProgress.length;
      report.averageEngagementQuality = videoProgress.reduce((sum, p) => sum + p.engagementQuality, 0) / videoProgress.length;
    }

    // Flag suspicious behavior
    progressRecords.forEach(prog => {
      const issues: string[] = [];

      if (prog.playbackSpeed > 2.0) {
        issues.push(`High playback speed: ${prog.playbackSpeed.toFixed(1)}x`);
      }

      if (prog.pauseCount > 20) {
        issues.push(`Excessive pauses: ${prog.pauseCount}`);
      }

      if (prog.seekCount > 10) {
        issues.push(`Excessive seeking: ${prog.seekCount}`);
      }

      if (prog.attentionSpanScore < 0.5) {
        issues.push(`Low attention: ${(prog.attentionSpanScore * 100).toFixed(0)}%`);
      }

      if (prog.engagementQuality < 0.5) {
        issues.push(`Low engagement quality: ${(prog.engagementQuality * 100).toFixed(0)}%`);
      }

      if (issues.length > 0) {
        report.flaggedResources.push({
          resourceId: prog.resource.id,
          resourceTitle: prog.resource.title,
          issues,
        });
      }
    });

    // Generate recommendations
    if (report.averagePlaybackSpeed > 1.5) {
      report.recommendations.push('Consider watching videos at normal speed to improve retention.');
    }

    if (report.averageAttentionScore < 0.6) {
      report.recommendations.push('Try to minimize distractions while watching videos.');
    }

    if (report.totalPauses / report.totalResources > 15) {
      report.recommendations.push('Frequent pausing may indicate distraction. Consider dedicated study time.');
    }

    if (report.totalSeeks / report.totalResources > 8) {
      report.recommendations.push('Excessive seeking may reduce learning effectiveness. Watch content sequentially.');
    }

    return report;
  }

  async getSkimmingDetectionAlerts(cohortId?: string, threshold: number = 0.5) {
    const where: any = {
      engagementQuality: { lt: threshold },
      state: { not: 'LOCKED' },
    };

    if (cohortId) {
      where.user = { cohortId };
    }

    const alerts = await this.prisma.resourceProgress.findMany({
      where,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        resource: {
          select: { id: true, title: true, type: true, sessionId: true },
        },
      },
      orderBy: { engagementQuality: 'asc' },
      take: 50,
    });

    return alerts.map(alert => ({
      userId: alert.user.id,
      userName: `${alert.user.firstName} ${alert.user.lastName}`,
      userEmail: alert.user.email,
      resourceTitle: alert.resource.title,
      resourceType: alert.resource.type,
      engagementQuality: alert.engagementQuality,
      playbackSpeed: alert.playbackSpeed,
      pauseCount: alert.pauseCount,
      seekCount: alert.seekCount,
      attentionScore: alert.attentionSpanScore,
      watchPercentage: alert.watchPercentage,
      timeSpent: alert.timeSpent,
      severity: alert.engagementQuality < 0.3 ? 'HIGH' : alert.engagementQuality < 0.5 ? 'MEDIUM' : 'LOW',
    }));
  }
}
