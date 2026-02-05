import { Controller, Get, Post, Param, Query, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceQueryDto, TrackEngagementDto } from './dto/resource.dto';

@ApiTags('resources')
@Controller('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get()
  getResources(@Request() req, @Query() query: ResourceQueryDto) {
    return this.resourcesService.getResources(req.user.id, query);
  }

  @Get(':id')
  getResourceById(@Param('id') id: string, @Request() req) {
    return this.resourcesService.getResourceById(id, req.user.id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark a resource as complete' })
  @ApiResponse({ status: 200, description: 'Resource marked complete' })
  @ApiResponse({ status: 403, description: 'Insufficient engagement - anti-skimming validation failed' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  markComplete(@Param('id') id: string, @Request() req) {
    return this.resourcesService.markComplete(id, req.user.id);
  }

  @Post(':id/track')
  @ApiOperation({ summary: 'Track user engagement with resource (scroll, video progress, time)' })
  @ApiResponse({ status: 200, description: 'Engagement tracked successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  trackEngagement(
    @Param('id') id: string,
    @Body() dto: TrackEngagementDto,
    @Request() req
  ) {
    return this.resourcesService.trackEngagement(id, req.user.id, dto);
  }
}
