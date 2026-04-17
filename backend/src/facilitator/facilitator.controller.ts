import { Controller, Get, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FacilitatorService } from './facilitator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SetCohortLeadershipDto } from './dto/set-cohort-leadership.dto';

@ApiTags('facilitator')
@Controller('facilitator')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FacilitatorController {
  constructor(private facilitatorService: FacilitatorService) {}

  @Get('cohorts/:cohortId/stats')
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN, UserRole.FELLOW)
  @ApiOperation({ summary: 'Get cohort statistics for facilitator dashboard' })
  getCohortStats(@Param('cohortId') cohortId: string, @Request() req) {
    return this.facilitatorService.getCohortStats(cohortId, req.user.id);
  }

  @Get('cohorts/:cohortId/fellows')
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN, UserRole.FELLOW)
  @ApiOperation({ summary: 'Get fellow engagement data for a cohort' })
  getFellowEngagement(@Param('cohortId') cohortId: string, @Request() req) {
    return this.facilitatorService.getFellowEngagement(cohortId, req.user.id);
  }

  @Get('cohorts/:cohortId/resources')
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN, UserRole.FELLOW)
  @ApiOperation({ summary: 'Get resource completion rates for a cohort' })
  getResourceCompletions(@Param('cohortId') cohortId: string, @Request() req) {
    return this.facilitatorService.getResourceCompletions(cohortId, req.user.id);
  }

  @Get('cohorts/:cohortId/fellow-resource-matrix')
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN, UserRole.FELLOW)
  @ApiOperation({
    summary:
      'Per-fellow resource progress matrix (captain / facilitator / admin cohort insight)',
  })
  getFellowResourceMatrix(@Param('cohortId') cohortId: string, @Request() req) {
    return this.facilitatorService.getFellowResourceMatrix(cohortId, req.user.id);
  }

  @Patch('cohorts/:cohortId/cohort-leadership')
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Assign or clear cohort captain and assistant (fellows in this cohort only)',
  })
  setCohortLeadership(
    @Param('cohortId') cohortId: string,
    @Body() dto: SetCohortLeadershipDto,
    @Request() req,
  ) {
    return this.facilitatorService.setCohortLeadership(cohortId, req.user.id, dto);
  }

  @Patch('cohorts/:cohortId/fellows/:fellowId/suspend')
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Suspend a fellow in facilitator\'s cohort' })
  suspendFellow(
    @Param('cohortId') cohortId: string,
    @Param('fellowId') fellowId: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    return this.facilitatorService.suspendFellow(cohortId, fellowId, req.user.id, body.reason);
  }

  @Patch('cohorts/:cohortId/fellows/:fellowId/unsuspend')
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Unsuspend a fellow in facilitator\'s cohort' })
  unsuspendFellow(
    @Param('cohortId') cohortId: string,
    @Param('fellowId') fellowId: string,
    @Request() req,
  ) {
    return this.facilitatorService.unsuspendFellow(cohortId, fellowId, req.user.id);
  }
}
