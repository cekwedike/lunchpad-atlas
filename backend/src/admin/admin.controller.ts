import {
  Controller,
  Patch,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  Query,
  Put,
  Post,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminUserService } from './admin-user.service';
import {
  CreateCohortDto,
  UpdateCohortDto,
  UpdateSessionDto,
  CreateSessionDto,
  BulkMarkAttendanceDto,
  AiReviewDto,
  AiChatDto,
  CreateQuizDto,
  GenerateAIQuestionsDto,
} from './dto/admin.dto';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ToggleResourceLockDto,
} from '../resources/dto/create-resource.dto';
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
  constructor(
    private adminService: AdminService,
    private adminUserService: AdminUserService,
  ) {}

  // ============ Cohort Management Endpoints ============

  @Get('cohorts')
  @ApiOperation({ summary: 'Get all cohorts (Admin only)' })
  @ApiResponse({ status: 200, description: 'Cohorts retrieved successfully' })
  getAllCohorts() {
    return this.adminService.getAllCohorts();
  }

  @Get('cohorts/:id/members')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR, UserRole.FELLOW)
  @ApiOperation({ summary: 'Get all members of a cohort' })
  getCohortMembers(@Param('id') cohortId: string, @Request() req: any) {
    return this.adminService.getCohortMembers(cohortId, req.user.id);
  }

  @Post('cohorts')
  @ApiOperation({ summary: 'Create a new cohort (Admin only)' })
  @ApiResponse({ status: 201, description: 'Cohort created successfully' })
  createCohort(@Body() dto: CreateCohortDto, @Request() req) {
    return this.adminService.createCohort(dto, req.user.id);
  }

  @Patch('cohorts/:id')
  @ApiOperation({ summary: 'Update cohort details (Admin only)' })
  @ApiParam({ name: 'id', description: 'Cohort ID' })
  @ApiResponse({ status: 200, description: 'Cohort updated successfully' })
  @ApiResponse({ status: 404, description: 'Cohort not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  updateCohort(
    @Param('id') cohortId: string,
    @Body() dto: UpdateCohortDto,
    @Request() req,
  ) {
    return this.adminService.updateCohort(cohortId, dto, req.user.id);
  }

  @Delete('cohorts/:id')
  @ApiOperation({ summary: 'Delete a cohort and all its users (Admin only)' })
  @ApiParam({ name: 'id', description: 'Cohort ID' })
  @ApiResponse({
    status: 200,
    description: 'Cohort and all users deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Cohort not found' })
  deleteCohort(@Param('id') cohortId: string, @Request() req) {
    return this.adminService.deleteCohort(cohortId, req.user.id);
  }

  @Post('cohorts/:id/facilitators')
  @ApiOperation({ summary: 'Add a facilitator to a cohort (Admin only)' })
  addCohortFacilitator(
    @Param('id') cohortId: string,
    @Body() body: { userId: string },
  ) {
    return this.adminService.addCohortFacilitator(cohortId, body.userId);
  }

  @Delete('cohorts/:id/facilitators/:userId')
  @ApiOperation({ summary: 'Remove a facilitator from a cohort (Admin only)' })
  removeCohortFacilitator(
    @Param('id') cohortId: string,
    @Param('userId') userId: string,
  ) {
    return this.adminService.removeCohortFacilitator(cohortId, userId);
  }

  @Post('sessions')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Create a new session for a cohort (Admin/Facilitator)' })
  @ApiResponse({ status: 201, description: 'Session created successfully' })
  createSession(@Body() dto: CreateSessionDto, @Request() req) {
    return this.adminService.createSession(dto, req.user.id);
  }

  @Patch('sessions/:id')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Update session details (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session updated successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  updateSession(
    @Param('id') sessionId: string,
    @Body() dto: UpdateSessionDto,
    @Request() req,
  ) {
    return this.adminService.updateSession(sessionId, dto, req.user.id);
  }

  @Get('sessions/:id/attendance')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Get attendance for a session (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  getSessionAttendance(@Param('id') sessionId: string, @Request() req) {
    return this.adminService.getSessionAttendance(sessionId, req.user.id);
  }

  @Post('sessions/:id/attendance')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Bulk mark attendance for a session (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  markBulkAttendance(
    @Param('id') sessionId: string,
    @Body() dto: BulkMarkAttendanceDto,
    @Request() req,
  ) {
    return this.adminService.markBulkAttendance(sessionId, dto, req.user.id);
  }

  @Post('sessions/:id/ai-review')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Submit transcript for AI analysis (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  submitAiReview(
    @Param('id') sessionId: string,
    @Body() dto: AiReviewDto,
    @Request() req,
  ) {
    return this.adminService.submitAiReview(sessionId, dto, req.user.id);
  }

  @Post('sessions/:id/award-points')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Manually award session engagement points to fellows based on AI analysis' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  awardSessionPoints(
    @Param('id') sessionId: string,
    @Body() dto: { awards: Array<{ userId: string; points: number; reason?: string }> },
    @Request() req,
  ) {
    return this.adminService.awardSessionPoints(sessionId, dto.awards, req.user.id);
  }

  @Post('sessions/:id/ai-chat')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Chat with AI about a session (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  aiChat(
    @Param('id') sessionId: string,
    @Body() dto: AiChatDto,
    @Request() req,
  ) {
    return this.adminService.aiChat(sessionId, dto, req.user.id);
  }

  @Delete('sessions/:id/analytics')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Delete session analytics (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  deleteSessionAnalytics(
    @Param('id') sessionId: string,
    @Request() req,
  ) {
    return this.adminService.deleteSessionAnalytics(sessionId, req.user.id);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get audit logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  getAuditLogs(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getAuditLogs(page, limit);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get platform metrics (Admin only)' })
  getPlatformMetrics() {
    return this.adminService.getPlatformMetrics();
  }

  // ============ User Management Endpoints ============

  @Get('users')
  @ApiOperation({ summary: 'Get all users with filters' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['FELLOW', 'FACILITATOR', 'ADMIN'],
  })
  @ApiQuery({
    name: 'cohortId',
    required: false,
    description: 'Filter by cohort ID',
  })
  @ApiQuery({ name: 'hasActivity', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAllUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('cohortId') cohortId?: string,
    @Query('hasActivity') hasActivity?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Parse role parameter - can be single or comma-separated
    let parsedRole: UserRole | UserRole[] | undefined;
    if (role) {
      const roles = role.split(',').map((r) => r.trim() as UserRole);
      parsedRole = roles.length === 1 ? roles[0] : roles;
    }

    return this.adminUserService.getAllUsers({
      search,
      role: parsedRole,
      cohortId,
      hasActivity,
      page: page ? +page : 1,
      limit: limit ? +limit : 50,
    });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  getUserById(@Param('id') userId: string) {
    return this.adminUserService.getUserById(userId);
  }

  @Get('users/:id/statistics')
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiParam({ name: 'id', description: 'User ID' })
  getUserStatistics(@Param('id') userId: string) {
    return this.adminUserService.getUserStatistics(userId);
  }

  @Get('users/:id/activity')
  @ApiOperation({ summary: 'Get user activity timeline' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserActivity(@Param('id') userId: string, @Query('limit') limit?: number) {
    return this.adminUserService.getUserActivity(userId, limit ? +limit : 50);
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User ID' })
  updateUserRole(
    @Param('id') userId: string,
    @Body() body: { role: UserRole },
    @Request() req,
  ) {
    return this.adminUserService.updateUserRole(userId, body.role, req.user.id);
  }

  @Put('users/:id/cohort')
  @ApiOperation({ summary: 'Update user cohort' })
  @ApiParam({ name: 'id', description: 'User ID' })
  updateUserCohort(
    @Param('id') userId: string,
    @Body() body: { cohortId: string | null },
  ) {
    return this.adminUserService.updateUserCohort(userId, body.cohortId);
  }

  @Patch('users/:id/facilitator')
  @ApiOperation({ summary: 'Grant or revoke facilitator privilege on an Admin user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  updateUserFacilitator(
    @Param('id') userId: string,
    @Body() body: { isFacilitator: boolean },
    @Request() req,
  ) {
    return this.adminUserService.updateUserFacilitator(userId, body.isFacilitator, req.user.id);
  }

  @Patch('users/:id/reset-points')
  @ApiOperation({ summary: 'Reset user points to zero' })
  @ApiParam({ name: 'id', description: 'User ID' })
  resetUserPoints(@Param('id') userId: string) {
    return this.adminUserService.resetUserPoints(userId);
  }

  @Put('users/bulk/assign-cohort')
  @ApiOperation({ summary: 'Bulk assign users to cohort' })
  bulkAssignCohort(
    @Body() body: { userIds: string[]; cohortId: string | null },
  ) {
    return this.adminUserService.bulkAssignCohort(body.userIds, body.cohortId);
  }

  @Put('users/bulk/update-role')
  @ApiOperation({ summary: 'Bulk update user roles' })
  bulkUpdateRole(@Body() body: { userIds: string[]; role: UserRole }) {
    return this.adminUserService.bulkUpdateRole(body.userIds, body.role);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteUser(@Param('id') userId: string, @Request() req) {
    return this.adminUserService.deleteUser(userId, req.user.id);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  suspendUser(
    @Param('id') userId: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    return this.adminUserService.suspendUser(userId, req.user.id, body.reason);
  }

  @Patch('users/:id/unsuspend')
  @ApiOperation({ summary: 'Unsuspend a user account' })
  unsuspendUser(@Param('id') userId: string, @Request() req) {
    return this.adminUserService.unsuspendUser(userId, req.user.id);
  }

  @Patch('users/:id/flag')
  @ApiOperation({ summary: 'Flag a user for suspicious activity review' })
  flagUser(@Param('id') userId: string, @Request() req) {
    return this.adminUserService.flagUser(userId, req.user.id);
  }

  @Patch('users/:id/unflag')
  @ApiOperation({ summary: 'Clear suspicious activity flag from a user' })
  unflagUser(@Param('id') userId: string, @Request() req) {
    return this.adminUserService.unflagUser(userId, req.user.id);
  }

  // ============ Resource Management Endpoints ============

  @Post('resources')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Create a new resource (Admin/Facilitator)' })
  @ApiResponse({ status: 201, description: 'Resource created successfully' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Facilitator role required',
  })
  createResource(@Body() dto: CreateResourceDto, @Request() req) {
    return this.adminService.createResource(dto, req.user.id);
  }

  @Get('resources')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({
    summary: 'Get all resources with optional filters (Admin/Facilitator only)',
  })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['VIDEO', 'ARTICLE', 'EXERCISE', 'QUIZ'],
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAllResources(
    @Query('sessionId') sessionId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('cohortId') cohortId?: string,
    @Request() req?: any,
  ) {
    return this.adminService.getAllResources({
      sessionId,
      type,
      search,
      page,
      limit,
      cohortId,
      requesterId: req?.user?.id,
    });
  }

  @Get('sessions/:sessionId/resources')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({
    summary: 'Get all resources for a session (Admin/Facilitator)',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  getResourcesBySession(@Param('sessionId') sessionId: string, @Request() req?: any) {
    return this.adminService.getResourcesBySession(sessionId, req?.user?.id);
  }

  @Patch('resources/:id')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Update a resource (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Resource updated successfully' })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Facilitator role required',
  })
  updateResource(
    @Param('id') resourceId: string,
    @Body() dto: UpdateResourceDto,
    @Request() req,
  ) {
    return this.adminService.updateResource(resourceId, dto, req.user.id);
  }

  @Patch('resources/:id/lock')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Toggle resource lock state (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Lock state updated' })
  toggleResourceLock(
    @Param('id') resourceId: string,
    @Body() dto: ToggleResourceLockDto,
    @Request() req,
  ) {
    return this.adminService.toggleResourceLock(resourceId, dto.state, req.user.id);
  }

  @Delete('resources/:id')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Delete a resource (Admin/Facilitator)' })
  @ApiParam({ name: 'id', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Resource deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - users have started this resource',
  })
  @ApiResponse({ status: 404, description: 'Resource not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Facilitator role required',
  })
  deleteResource(@Param('id') resourceId: string, @Request() req) {
    return this.adminService.deleteResource(resourceId, req.user.id);
  }

  // ─── Quiz Management ────────────────────────────────────────────────────────

  @Get('quizzes/cohort/:cohortId')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Get all quizzes for a cohort' })
  getCohortQuizzes(@Param('cohortId') cohortId: string) {
    return this.adminService.getCohortQuizzes(cohortId);
  }

  @Post('quizzes')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Create a quiz with questions' })
  createQuiz(@Body() dto: CreateQuizDto) {
    return this.adminService.createQuiz(dto);
  }

  @Patch('quizzes/:quizId')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Update a quiz and its questions' })
  updateQuiz(@Param('quizId') quizId: string, @Body() dto: any) {
    return this.adminService.updateQuiz(quizId, dto);
  }

  @Delete('quizzes/:quizId')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Delete a quiz' })
  deleteQuiz(@Param('quizId') quizId: string) {
    return this.adminService.deleteQuiz(quizId);
  }

  @Post('quizzes/generate-ai')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'AI-generate quiz questions from a topic' })
  generateAIQuestions(@Body() dto: GenerateAIQuestionsDto) {
    return this.adminService.generateAIQuizQuestions(dto);
  }

  @Post('live-quiz/:liveQuizId/notify')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  @ApiOperation({ summary: 'Notify cohort fellows who have not yet joined a live quiz' })
  notifyLiveQuizJoin(@Param('liveQuizId') liveQuizId: string, @Request() req) {
    return this.adminService.notifyLiveQuizJoin(liveQuizId, req.user.id);
  }
}
