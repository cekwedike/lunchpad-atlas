import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Res,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type * as express from 'express';
import { IsString, IsObject, IsOptional } from 'class-validator';

import { SessionAnalyticsService } from './session-analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PrismaService } from '../prisma.service';

class TrackEventDto {
  @IsString()
  eventType: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

@ApiTags('session-analytics')
@Controller('session-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionAnalyticsController {
  constructor(
    private sessionAnalyticsService: SessionAnalyticsService,
    private analyticsExportService: AnalyticsExportService,
    private prisma: PrismaService,
  ) {}

  @Post('process/:sessionId')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Process session transcript with AI analytics' })
  async processSession(
    @Param('sessionId') sessionId: string,
    @Body() data: { transcript: string },
    @Request() req: { user: { id: string } },
  ) {
    return this.sessionAnalyticsService.processSessionAnalytics(
      sessionId,
      data.transcript,
      req.user.id,
    );
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get analytics for a specific session' })
  async getSessionAnalytics(
    @Param('sessionId') sessionId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.sessionAnalyticsService.getSessionAnalytics(sessionId, req.user.id);
  }

  @Get('cohort/:cohortId')
  @ApiOperation({ summary: 'Get aggregated analytics for a cohort' })
  async getCohortAnalytics(
    @Param('cohortId') cohortId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.sessionAnalyticsService.getCohortAnalytics(cohortId, req.user.id);
  }

  @Get('cohort/:cohortId/insights')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Generate AI insights for cohort performance' })
  async getCohortInsights(
    @Param('cohortId') cohortId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.sessionAnalyticsService.generateCohortInsights(cohortId, req.user.id);
  }

  @Get('export/session/:sessionId/csv')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Export session analytics as CSV' })
  async exportSessionCSV(
    @Param('sessionId') sessionId: string,
    @Request() req: { user: { id: string } },
    @Res() res: express.Response,
  ) {
    await this.sessionAnalyticsService.assertViewerCanAccessSession(req.user.id, sessionId);
    const csv =
      await this.analyticsExportService.exportSessionAnalyticsToCSV(sessionId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=session-${sessionId}-analytics.csv`,
    );
    res.send(csv);
  }

  @Get('export/cohort/:cohortId/csv')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Export cohort analytics as CSV' })
  async exportCohortCSV(
    @Param('cohortId') cohortId: string,
    @Request() req: { user: { id: string } },
    @Res() res: express.Response,
  ) {
    await this.sessionAnalyticsService.assertViewerCanAccessCohort(req.user.id, cohortId);
    const csv =
      await this.analyticsExportService.exportCohortAnalyticsToCSV(cohortId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=cohort-${cohortId}-analytics.csv`,
    );
    res.send(csv);
  }

  @Get('export/resource-progress/:sessionId/csv')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Export resource progress as CSV' })
  async exportResourceProgressCSV(
    @Param('sessionId') sessionId: string,
    @Request() req: { user: { id: string } },
    @Res() res: express.Response,
  ) {
    await this.sessionAnalyticsService.assertViewerCanAccessSession(req.user.id, sessionId);
    const csv =
      await this.analyticsExportService.exportResourceProgressToCSV(sessionId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=resource-progress-${sessionId}.csv`,
    );
    res.send(csv);
  }

  @Get('export/leaderboard/:cohortId/csv')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Export leaderboard as CSV' })
  async exportLeaderboardCSV(
    @Param('cohortId') cohortId: string,
    @Request() req: { user: { id: string } },
    @Res() res: express.Response,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    await this.sessionAnalyticsService.assertViewerCanAccessCohort(req.user.id, cohortId);
    const csv = await this.analyticsExportService.exportLeaderboardToCSV(
      cohortId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=leaderboard-${cohortId}.csv`,
    );
    res.send(csv);
  }

  @Get('summary/:cohortId')
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get analytics summary for cohort' })
  async getAnalyticsSummary(
    @Param('cohortId') cohortId: string,
    @Request() req: { user: { id: string } },
  ) {
    await this.sessionAnalyticsService.assertViewerCanAccessCohort(req.user.id, cohortId);
    return this.analyticsExportService.generateAnalyticsSummary(cohortId);
  }

  // Accessible to all authenticated users (no @Roles restriction)
  @Post('/events')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'Track a client-side engagement event' })
  async trackEvent(@Body() dto: TrackEventDto, @Request() req: { user: { id: string } }) {
    const validTypes = [
      'RESOURCE_VIEW', 'RESOURCE_COMPLETE', 'DISCUSSION_POST', 'DISCUSSION_COMMENT',
      'QUIZ_SUBMIT', 'CHAT_MESSAGE', 'SESSION_ATTEND',
    ];
    const eventType = validTypes.includes(dto.eventType) ? dto.eventType : 'RESOURCE_VIEW';

    const meta = dto.metadata ?? {};
    if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) {
      throw new BadRequestException('metadata must be a plain object');
    }
    const keys = Object.keys(meta as Record<string, unknown>);
    if (keys.length > 40) {
      throw new BadRequestException('metadata has too many keys');
    }
    let approxSize = 0;
    for (const k of keys) {
      if (k.length > 64) {
        throw new BadRequestException('metadata key too long');
      }
      const v = (meta as Record<string, unknown>)[k];
      const sv = typeof v === 'string' ? v : JSON.stringify(v ?? null);
      approxSize += k.length + sv.length;
      if (approxSize > 8000) {
        throw new BadRequestException('metadata payload too large');
      }
    }

    await this.prisma.engagementEvent.create({
      data: {
        userId: req.user.id,
        eventType: eventType as any,
        metadata: meta as object,
      },
    });

    return { ok: true };
  }
}
