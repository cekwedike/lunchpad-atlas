import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { EnhancedEngagementService } from './enhanced-engagement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ResourceQueryDto,
  TrackEngagementDto,
  AdminUnlockResourceDto,
} from './dto/resource.dto';

@ApiTags('resources')
@Controller('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(
    private resourcesService: ResourcesService,
    private engagementService: EnhancedEngagementService,
  ) {}

  // ── Static GET routes MUST come before parameterized :id routes ───────

  @Get()
  async getResources(@Request() req, @Query() query: ResourceQueryDto) {
    return await this.resourcesService.getResources(req.user.id, query);
  }

  @Get('engagement/report')
  @ApiOperation({ summary: 'Get engagement quality report for user' })
  getEngagementReport(@Request() req, @Query('sessionId') sessionId?: string) {
    return this.engagementService.generateEngagementReport(
      req.user.id,
      sessionId,
    );
  }

  @Get('engagement/alerts')
  @UseGuards(RolesGuard)
  @Roles('FACILITATOR', 'ADMIN')
  @ApiOperation({ summary: 'Get skimming detection alerts' })
  getSkimmingAlerts(
    @Query('cohortId') cohortId?: string,
    @Query('threshold') threshold?: string,
  ) {
    return this.engagementService.getSkimmingDetectionAlerts(
      cohortId,
      threshold ? parseFloat(threshold) : 0.5,
    );
  }

  // ── Parameterized :id route (must be AFTER all static GET routes) ─────

  @Get(':id')
  getResourceById(@Param('id') id: string, @Request() req) {
    return this.resourcesService.getResourceById(id, req.user.id);
  }

  // ── Static POST routes MUST come before parameterized :id POST routes ─

  @Post('admin/unlock')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'FACILITATOR')
  @ApiOperation({
    summary: 'Manually unlock a resource for a specific user',
  })
  @ApiResponse({ status: 200, description: 'Resource unlocked successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Facilitator only' })
  adminUnlockResource(@Body() dto: AdminUnlockResourceDto) {
    return this.resourcesService.adminUnlockResource(
      dto.userId,
      dto.resourceId,
    );
  }

  // ── Parameterized :id POST routes ─────────────────────────────────────

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a resource as complete' })
  @ApiResponse({ status: 200, description: 'Resource marked complete' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient engagement - anti-skimming validation failed',
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  markComplete(@Param('id') id: string, @Request() req) {
    return this.resourcesService.markComplete(id, req.user.id);
  }

  @Post(':id/track')
  @ApiOperation({
    summary:
      'Track user engagement with resource (scroll, video progress, time)',
  })
  @ApiResponse({ status: 200, description: 'Engagement tracked successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  trackEngagement(
    @Param('id') id: string,
    @Body() dto: TrackEngagementDto,
    @Request() req,
  ) {
    return this.resourcesService.trackEngagement(id, req.user.id, dto);
  }

  @Post(':id/track-video')
  @ApiOperation({ summary: 'Track advanced video engagement metrics' })
  trackVideoEngagement(
    @Param('id') id: string,
    @Body()
    data: {
      playbackSpeed?: number;
      pauseCount?: number;
      seekCount?: number;
      attentionScore?: number;
    },
    @Request() req,
  ) {
    return this.engagementService.trackVideoEngagement(req.user.id, id, data);
  }
}
