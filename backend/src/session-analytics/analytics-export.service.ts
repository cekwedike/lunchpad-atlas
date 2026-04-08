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

    const rows = analytics.map((a) =>
      [
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
      ].join(','),
    );

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

      const attendanceRate =
        analytics.totalFellows > 0
          ? (
              (analytics.fellowsAttended / analytics.totalFellows) *
              100
            ).toFixed(2)
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
        rows.push(
          [
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
          ].join(','),
        );
      });
    });

    return [headers, ...rows].join('\n');
  }

  async exportLeaderboardToCSV(
    cohortId: string,
    month?: number,
    year?: number,
  ): Promise<string> {
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
        rows.push(
          [
            board.month,
            board.year,
            entry.rank,
            `"${entry.user.firstName} ${entry.user.lastName}"`,
            entry.user.email,
            entry.totalPoints,
          ].join(','),
        );
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
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
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
    const totalFellows = cohort.fellows.filter((f) => f.role === 'FELLOW').length;
    const sessionsWithAnalytics = cohort.sessions.filter(
      (s) => s.sessionAnalytics.length > 0,
    ).length;

    const avgEngagement =
      cohort.sessions
        .filter((s) => s.sessionAnalytics[0]?.engagementScore)
        .reduce(
          (sum, s) => sum + (s.sessionAnalytics[0].engagementScore || 0),
          0,
        ) / sessionsWithAnalytics || 0;

    const totalResources = cohort.sessions.reduce(
      (sum, s) => sum + s.resources.length,
      0,
    );
    const completedProgress = cohort.sessions.reduce(
      (sum, s) =>
        sum +
        s.resources.reduce(
          (rSum, r) =>
            rSum + r.progress.filter((p) => p.state === 'COMPLETED').length,
          0,
        ),
      0,
    );

    const completionRate =
      totalResources > 0
        ? (completedProgress / (totalResources * totalFellows)) * 100
        : 0;

    const fellowIds = cohort.fellows.filter((f) => f.role === 'FELLOW').map((f) => f.id);

    // Analytics top performers should reflect the same source of truth as the live leaderboard:
    // pointsLog within the current calendar month. Leaderboard snapshot tables may not exist yet.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    let topPerformers: Array<{ rank: number; name: string; totalPoints: number }> = [];
    let totalPointsAwarded = 0;
    let totalAppTimeSeconds = 0;
    let appTimePerFellow: Array<{ userId: string; name: string; hours: number; seconds: number }> = [];

    if (fellowIds.length > 0) {
      const appTimeAgg = await (this.prisma as any).platformTimeDaily.aggregate({
        where: {
          userId: { in: fellowIds },
          day: { gte: monthStart, lte: monthEnd },
        },
        _sum: { seconds: true },
      });
      totalAppTimeSeconds = appTimeAgg?._sum?.seconds ?? 0;

      const appTimeByUser = await (this.prisma as any).platformTimeDaily.groupBy({
        by: ['userId'],
        where: {
          userId: { in: fellowIds },
          day: { gte: monthStart, lte: monthEnd },
        },
        _sum: { seconds: true },
      });

      const fellowNames = new Map(
        cohort.fellows
          .filter((f) => f.role === 'FELLOW')
          .map((f) => [f.id, `${f.firstName} ${f.lastName}`.trim()] as const),
      );

      const secondsMap = new Map<string, number>(
        (appTimeByUser || []).map((r: any) => [r.userId, r._sum?.seconds ?? 0]),
      );

      appTimePerFellow = fellowIds.map((id) => {
        const seconds = secondsMap.get(id) ?? 0;
        const hours = Number((seconds / 3600).toFixed(2));
        return { userId: id, name: fellowNames.get(id) || 'Unknown', hours, seconds };
      });

      const pointsAll = await this.prisma.pointsLog.groupBy({
        by: ['userId'],
        where: { userId: { in: fellowIds }, createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
      });

      totalPointsAwarded = pointsAll.reduce((sum, p) => sum + (p._sum.points ?? 0), 0);

      const top = pointsAll.slice(0, 5);
      const ids = top.map((p) => p.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstName: true, lastName: true },
      });
      const nameMap = new Map(
        users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]),
      );
      topPerformers = top.map((p, idx) => ({
        rank: idx + 1,
        name: nameMap.get(p.userId) || 'Unknown',
        totalPoints: p._sum.points ?? 0,
      }));
    }

    // Per-session engagement for trend visualisation
    const sessionEngagement = cohort.sessions.map((s) => ({
      sessionNumber: s.sessionNumber,
      title: s.title,
      engagementScore: s.sessionAnalytics[0]?.engagementScore ?? null,
      participationRate: s.sessionAnalytics[0]?.participationRate ?? null,
    }));

    return {
      cohort: {
        name: cohort.name,
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        state: cohort.state,
        sessions: cohort.sessions.map((s) => ({
          id: s.id,
          sessionNumber: s.sessionNumber,
          title: s.title,
        })),
      },
      statistics: {
        totalFellows,
        totalSessions,
        sessionsWithAnalytics,
        totalResources,
        completedResources: completedProgress,
        avgEngagementScore: avgEngagement.toFixed(2),
        overallCompletionRate: completionRate.toFixed(2) + '%',
        totalPointsAwarded,
        totalAppTimeSeconds,
        totalAppTimeHours: Number((totalAppTimeSeconds / 3600).toFixed(2)),
        avgAppTimeHoursPerFellow:
          totalFellows > 0 ? Number(((totalAppTimeSeconds / 3600) / totalFellows).toFixed(2)) : 0,
      },
      appTimePerFellow,
      topPerformers,
      sessionEngagement,
    };
  }
}
