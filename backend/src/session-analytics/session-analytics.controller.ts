import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionAnalyticsService } from './session-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('session-analytics')
@Controller('session-analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SessionAnalyticsController {
  constructor(private sessionAnalyticsService: SessionAnalyticsService) {}

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
}
