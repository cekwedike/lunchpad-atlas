import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FeedbackService, CreateFeedbackDto, RespondFeedbackDto } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, FeedbackType, FeedbackStatus } from '@prisma/client';

@ApiTags('feedback')
@Controller('feedback')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: 'Submit feedback' })
  create(@Request() req, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my submitted feedback' })
  getMyFeedback(@Request() req) {
    return this.feedbackService.getMyFeedback(req.user.id);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: get all feedback' })
  getAllFeedback(
    @Query('status') status?: FeedbackStatus,
    @Query('type') type?: FeedbackType,
  ) {
    return this.feedbackService.getAllFeedback(status, type);
  }

  @Patch('admin/:id/respond')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: respond to feedback' })
  respond(
    @Request() req,
    @Param('id') feedbackId: string,
    @Body() dto: RespondFeedbackDto,
  ) {
    return this.feedbackService.respond(req.user.id, feedbackId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete feedback (own or admin)' })
  delete(@Request() req, @Param('id') feedbackId: string) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.feedbackService.delete(req.user.id, feedbackId, isAdmin);
  }
}
