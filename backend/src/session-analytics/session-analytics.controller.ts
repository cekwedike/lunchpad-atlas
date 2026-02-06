import { Controller, Get, Post, Body, Param, UseGuards, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { SessionAnalyticsService } from './session-analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('session-analytics')
@Controller('session-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionAnalyticsController {
  constructor(
    private sessionAnalyticsService: SessionAnalyticsService,
    private analyticsExportService: AnalyticsExportService,
  ) {}

  @Post('process/:sessionId')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Process session transcript with AI analytics' })
  async processSession(
    @Param('sessionId') sessionId: string,
    @Body() data: { transcript: string },
  ) {
    return this.sessionAnalyticsService.processSessionAnalytics(sessionId, data.transcript);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get analytics for a specific session' })
  async getSessionAnalytics(@Param('sessionId') sessionId: string) {
    return this.sessionAnalyticsService.getSessionAnalytics(sessionId);
  }

  @Get('cohort/:cohortId')
  @ApiOperation({ summary: 'Get aggregated analytics for a cohort' })
  async getCohortAnalytics(@Param('cohortId') cohortId: string) {
    return this.sessionAnalyticsService.getCohortAnalytics(cohortId);
  }

  @Get('cohort/:cohortId/insights')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Generate AI insights for cohort performance' })
  async getCohortInsights(@Param('cohortId') cohortId: string) {
    return this.sessionAnalyticsService.generateCohortInsights(cohortId);
  }

  @Get('export/session/:sessionId/csv')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Export session analytics as CSV' })
  async exportSessionCSV(@Param('sessionId') sessionId: string, @Res() res: Response) {
    const csv = await this.analyticsExportService.exportSessionAnalyticsToCSV(sessionId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=session-${sessionId}-analytics.csv`);
    res.send(csv);
  }

  @Get('export/cohort/:cohortId/csv')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Export cohort analytics as CSV' })
  async exportCohortCSV(@Param('cohortId') cohortId: string, @Res() res: Response) {
    const csv = await this.analyticsExportService.exportCohortAnalyticsToCSV(cohortId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=cohort-${cohortId}-analytics.csv`);
    res.send(csv);
  }

  @Get('export/resource-progress/:sessionId/csv')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Export resource progress as CSV' })
  async exportResourceProgressCSV(@Param('sessionId') sessionId: string, @Res() res: Response) {
    const csv = await this.analyticsExportService.exportResourceProgressToCSV(sessionId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=resource-progress-${sessionId}.csv`);
    res.send(csv);
  }

  @Get('export/leaderboard/:cohortId/csv')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Export leaderboard as CSV' })
  async exportLeaderboardCSV(
    @Param('cohortId') cohortId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Res() res: Response,
  ) {
    const csv = await this.analyticsExportService.exportLeaderboardToCSV(
      cohortId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leaderboard-${cohortId}.csv`);
    res.send(csv);
  }

  @Get('summary/:cohortId')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get analytics summary for cohort' })
  async getAnalyticsSummary(@Param('cohortId') cohortId: string) {
    return this.analyticsExportService.generateAnalyticsSummary(cohortId);
  }
}
