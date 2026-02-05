import { Controller, Patch, Body, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateCohortDto, UpdateSessionDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Patch('cohorts/:id')
  @ApiOperation({ summary: 'Update cohort details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Cohort ID' })
  @ApiResponse({ status: 200, description: 'Cohort updated successfully' })
  @ApiResponse({ status: 404, description: 'Cohort not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  updateCohort(
    @Param('id') cohortId: string,
    @Body() dto: UpdateCohortDto,
    @Request() req
  ) {
    return this.adminService.updateCohort(cohortId, dto, req.user.id);
  }

  @Patch('sessions/:id')
  @ApiOperation({ summary: 'Update session details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  updateSession(
    @Param('id') sessionId: string,
    @Body() dto: UpdateSessionDto,
    @Request() req
  ) {
    return this.adminService.updateSession(sessionId, dto, req.user.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  getAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.adminService.getAuditLogs(page, limit);
  }
}
