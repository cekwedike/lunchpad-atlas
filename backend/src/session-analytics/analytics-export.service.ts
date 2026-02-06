import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

interface CSVExportOptions {
  sessionId?: string;
  cohortId?: string;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AnalyticsExportService {
  constructor(private prisma: PrismaService) {}

  async exportSessionAnalyticsToCSV(sessionId: string): Promise<string> {
    const analytics = await this.prisma.sessionAnalytics.findMany({
      where: { sessionId },
      include: {
        session: {
          select: {
            title: true,
            sessionNumber: true,
            scheduledDate: true,
          },
        },
      },
    });

    if (analytics.length === 0) {
      throw new Error('No analytics data found');
    }

    const headers = [
      'Session Number',
      'Session Title',
      'Scheduled Date',
      'Total Fellows',
      'Fellows Attended',
      'Avg Resources Completed',
      'Avg Points',
      'Engagement Score',
      'Participation Rate',
      'Average Attention',
      'Question Count',
      'Interaction Count',
      'AI Processed At',
    ].join(',');

    const rows = analytics.map((a) => [
      a.session.sessionNumber,
      `"${a.session.title}"`,
      a.session.scheduledDate.toISOString().split('T')[0],
      a.totalFellows,
      a.fellowsAttended,
      a.avgResourcesCompleted.toFixed(2),
      a.avgPoints.toFixed(2),
      a.engagementScore?.toFixed(2) || 'N/A',
      a.participationRate?.toFixed(2) || 'N/A',
      a.averageAttention?.toFixed(2) || 'N/A',
      a.questionCount,
      a.interactionCount,
      a.aiProcessedAt?.toISOString() || 'N/A',
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  async exportCohortAnalyticsToCSV(cohortId: string): Promise<string> {
    const sessions = await this.prisma.session.findMany({
      where: { cohortId },
      include: {
        sessionAnalytics: true,
      },
      orderBy: { sessionNumber: 'asc' },
    });

    const headers = [
      'Session Number',
      'Session Title',
      'Total Fellows',
      'Fellows Attended',
      'Attendance %',
      'Avg Resources Completed',
      'Avg Points',
      'Engagement Score',
    ].join(',');

    const rows = sessions.map((session) => {
      const analytics = session.sessionAnalytics[0];
      if (!analytics) {
        return [
          session.sessionNumber,
          `"${session.title}"`,
          'N/A',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
          'N/A',
        ].join(',');
      }

      const attendanceRate = analytics.totalFellows > 0
        ? ((analytics.fellowsAttended / analytics.totalFellows) * 100).toFixed(2)
        : '0';

      return [
        session.sessionNumber,
        `"${session.title}"`,
        analytics.totalFellows,
        analytics.fellowsAttended,
        attendanceRate,
        analytics.avgResourcesCompleted.toFixed(2),
        analytics.avgPoints.toFixed(2),
        analytics.engagementScore?.toFixed(2) || 'N/A',
      ].join(',');
    });

    return [headers, ...rows].join('\n');
  }

  async exportResourceProgressToCSV(sessionId: string): Promise<string> {
    const resources = await this.prisma.resource.findMany({
      where: { sessionId },
      include: {
        progress: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    const headers = [
      'Resource Title',
      'Type',
      'User Name',
      'Email',
      'State',
      'Time Spent (min)',
      'Watch %',
      'Scroll Depth %',
      'Playback Speed',
      'Pause Count',
      'Seek Count',
      'Attention Score',
      'Engagement Quality',
      'Points Awarded',
      'Completed At',
    ].join(',');

    const rows: string[] = [];
    
    resources.forEach((resource) => {
      resource.progress.forEach((prog) => {
        rows.push([
          `"${resource.title}"`,
          resource.type,
          `"${prog.user.firstName} ${prog.user.lastName}"`,
          prog.user.email,
          prog.state,
          (prog.timeSpent / 60).toFixed(2),
          prog.watchPercentage,
          prog.scrollDepth,
          prog.playbackSpeed.toFixed(2),
          prog.pauseCount,
          prog.seekCount,
          prog.attentionSpanScore.toFixed(2),
          prog.engagementQuality.toFixed(2),
          prog.pointsAwarded,
          prog.completedAt?.toISOString() || 'N/A',
        ].join(','));
      });
    });

    return [headers, ...rows].join('\n');
  }

  async exportLeaderboardToCSV(cohortId: string, month?: number, year?: number): Promise<string> {
    const where: any = { cohortId };
    
    if (month && year) {
      where.month = month;
      where.year = year;
    }

    const leaderboards = await this.prisma.monthlyLeaderboard.findMany({
      where,
      include: {
        entries: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { rank: 'asc' },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    if (leaderboards.length === 0) {
      throw new Error('No leaderboard data found');
    }

    const headers = [
      'Month',
      'Year',
      'Rank',
      'User Name',
      'Email',
      'Total Points',
    ].join(',');

    const rows: string[] = [];

    leaderboards.forEach((board) => {
      board.entries.forEach((entry) => {
        rows.push([
          board.month,
          board.year,
          entry.rank,
          `"${entry.user.firstName} ${entry.user.lastName}"`,
          entry.user.email,
          entry.totalPoints,
        ].join(','));
      });
    });

    return [headers, ...rows].join('\n');
  }

  async generateAnalyticsSummary(cohortId: string): Promise<any> {
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        fellows: true,
        sessions: {
          include: {
            sessionAnalytics: true,
            resources: {
              include: {
                progress: true,
              },
            },
          },
        },
        leaderboards: {
          include: {
            entries: {
              orderBy: { rank: 'asc' },
              take: 10,
            },
          },
        },
      },
    });

    if (!cohort) {
      throw new Error('Cohort not found');
    }

    // Calculate overall statistics
    const totalSessions = cohort.sessions.length;
    const totalFellows = cohort.fellows.length;
    const sessionsWithAnalytics = cohort.sessions.filter(s => s.sessionAnalytics.length > 0).length;

    const avgEngagement = cohort.sessions
      .filter(s => s.sessionAnalytics[0]?.engagementScore)
      .reduce((sum, s) => sum + (s.sessionAnalytics[0].engagementScore || 0), 0) / sessionsWithAnalytics || 0;

    const totalResources = cohort.sessions.reduce((sum, s) => sum + s.resources.length, 0);
    const completedProgress = cohort.sessions.reduce(
      (sum, s) => sum + s.resources.reduce(
        (rSum, r) => rSum + r.progress.filter(p => p.state === 'COMPLETED').length,
        0
      ),
      0
    );

    const completionRate = totalResources > 0 ? (completedProgress / (totalResources * totalFellows)) * 100 : 0;

    return {
      cohort: {
        name: cohort.name,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        state: cohort.state,
      },
      statistics: {
        totalFellows,
        totalSessions,
        sessionsWithAnalytics,
        totalResources,
        avgEngagementScore: avgEngagement.toFixed(2),
        overallCompletionRate: completionRate.toFixed(2) + '%',
      },
      topPerformers: cohort.leaderboards[0]?.entries.slice(0, 5).map(e => ({
        rank: e.rank,
        userId: e.userId,
        totalPoints: e.totalPoints,
      })) || [],
    };
  }
}
