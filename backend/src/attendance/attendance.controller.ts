import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Request,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('attendance')
@Controller('attendance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('session/:sessionId/qr-code')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Generate QR code for session check-in (Facilitator/Admin only)',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'QR code generated successfully' })
  async generateQRCode(@Param('sessionId') sessionId: string) {
    const qrCodeDataUrl =
      await this.attendanceService.generateSessionQRCode(sessionId);
    return { qrCode: qrCodeDataUrl };
  }

  @Post('check-in/:sessionId')
  @ApiOperation({ summary: 'Check in to a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 201, description: 'Checked in successfully' })
  @ApiResponse({
    status: 400,
    description: 'Already checked in or invalid session',
  })
  async checkIn(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      latitude?: number;
      longitude?: number;
      ipAddress?: string;
      userAgent?: string;
    },
    @Request() req,
  ) {
    return this.attendanceService.checkIn(req.user.id, sessionId, body);
  }

  @Post('check-out/:sessionId')
  @ApiOperation({ summary: 'Check out from a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Checked out successfully' })
  @ApiResponse({
    status: 400,
    description: 'Not checked in or already checked out',
  })
  async checkOut(@Param('sessionId') sessionId: string, @Request() req) {
    return this.attendanceService.checkOut(req.user.id, sessionId);
  }

  @Get('session/:sessionId/me')
  @ApiOperation({ summary: 'Get my attendance record for session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Attendance record retrieved' })
  async getMyAttendance(@Param('sessionId') sessionId: string, @Request() req) {
    return this.attendanceService.getUserAttendance(req.user.id, sessionId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my attendance history' })
  @ApiQuery({
    name: 'cohortId',
    required: false,
    description: 'Filter by cohort',
  })
  @ApiResponse({ status: 200, description: 'Attendance history retrieved' })
  async getMyHistory(@Query('cohortId') cohortId: string, @Request() req) {
    return this.attendanceService.getUserAttendanceHistory(
      req.user.id,
      cohortId,
    );
  }

  @Get('session/:sessionId/report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Get comprehensive attendance report for session (Facilitator/Admin only)',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Attendance report generated' })
  async getSessionReport(@Param('sessionId') sessionId: string): Promise<any> {
    return this.attendanceService.generateSessionReport(sessionId);
  }

  @Get('cohort/:cohortId/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get cohort attendance statistics (Facilitator/Admin only)',
  })
  @ApiParam({ name: 'cohortId', description: 'Cohort ID' })
  @ApiResponse({
    status: 200,
    description: 'Cohort attendance stats retrieved',
  })
  async getCohortStats(@Param('cohortId') cohortId: string) {
    return this.attendanceService.getCohortAttendanceStats(cohortId);
  }

  @Patch('session/:sessionId/user/:userId/excuse')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mark absence as excused (Facilitator/Admin only)' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Absence marked as excused' })
  async markExcused(
    @Param('sessionId') sessionId: string,
    @Param('userId') userId: string,
    @Body() body: { notes?: string },
  ) {
    return this.attendanceService.markExcused(sessionId, userId, body.notes);
  }
}
