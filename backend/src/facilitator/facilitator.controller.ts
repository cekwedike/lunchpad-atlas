import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FacilitatorService } from './facilitator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('facilitator')
@Controller('facilitator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.FACILITATOR, UserRole.ADMIN)
@ApiBearerAuth()
export class FacilitatorController {
  constructor(private facilitatorService: FacilitatorService) {}

  @Get('cohorts/:cohortId/stats')
  @ApiOperation({ summary: 'Get cohort statistics for facilitator dashboard' })
  getCohortStats(@Param('cohortId') cohortId: string, @Request() req) {
    return this.facilitatorService.getCohortStats(cohortId, req.user.id);
  }

  @Get('cohorts/:cohortId/fellows')
  @ApiOperation({ summary: 'Get fellow engagement data for a cohort' })
  getFellowEngagement(@Param('cohortId') cohortId: string, @Request() req) {
    return this.facilitatorService.getFellowEngagement(cohortId, req.user.id);
  }

  @Get('cohorts/:cohortId/resources')
  @ApiOperation({ summary: 'Get resource completion rates for a cohort' })
  getResourceCompletions(@Param('cohortId') cohortId: string, @Request() req) {
    return this.facilitatorService.getResourceCompletions(cohortId, req.user.id);
  }
}
