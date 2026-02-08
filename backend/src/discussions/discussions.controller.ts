import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto, CreateCommentDto, DiscussionFilterDto, CommentReactionDto } from './dto/discussion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('discussions')
@Controller('discussions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DiscussionsController {
  constructor(private discussionsService: DiscussionsService) {}

  @Get()
  getDiscussions(@Query() filters: DiscussionFilterDto) {
    return this.discussionsService.getDiscussions(filters);
  }

  @Get('topics')
  @ApiOperation({ summary: 'Get available discussion topics for a cohort' })
  getDiscussionTopics(@Query('cohortId') cohortId: string) {
    return this.discussionsService.getDiscussionTopics(cohortId);
  }

  @Get(':id')
  getDiscussion(@Param('id') id: string) {
    return this.discussionsService.getDiscussion(id);
  }

  @Post()
  createDiscussion(@Request() req, @Body() dto: CreateDiscussionDto) {
    return this.discussionsService.createDiscussion(req.user.id, req.user.role, dto);
  }

  @Post(':id/like')
  likeDiscussion(@Param('id') id: string, @Request() req) {
    return this.discussionsService.likeDiscussion(id, req.user.id);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string, @Request() req) {
    return this.discussionsService.getComments(id, req.user.id);
  }

  @Post(':id/comments')
  createComment(@Param('id') id: string, @Request() req, @Body() dto: CreateCommentDto) {
    return this.discussionsService.createComment(id, req.user.id, dto);
  }

  @Delete(':id')
  deleteDiscussion(@Param('id') id: string, @Request() req) {
    return this.discussionsService.deleteDiscussion(id, req.user.id, req.user.role);
  }

  @Post(':id/score-quality')
  @ApiOperation({ summary: 'AI score discussion quality' })
  scoreDiscussionQuality(@Param('id') id: string) {
    return this.discussionsService.scoreDiscussionQuality(id);
  }

  @Get('quality/top')
  @ApiOperation({ summary: 'Get high quality discussions' })
  getHighQualityDiscussions(
    @Query('cohortId') cohortId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.discussionsService.getHighQualityDiscussions(cohortId, limit);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent discussions' })
  getRecentDiscussions(@Query('limit') limit?: number) {
    return this.discussionsService.getRecentDiscussions(limit ? +limit : 5);
  }

  @Post(':id/pin')
  @ApiOperation({ summary: 'Toggle pin status (Admin only)' })
  togglePin(@Param('id') id: string, @Request() req) {
    return this.discussionsService.togglePin(id, req.user.role);
  }

  @Post(':id/lock')
  @ApiOperation({ summary: 'Toggle lock status (Admin only)' })
  toggleLock(@Param('id') id: string, @Request() req) {
    return this.discussionsService.toggleLock(id, req.user.role);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment (own comments or admin)' })
  deleteComment(@Param('commentId') commentId: string, @Request() req) {
    return this.discussionsService.deleteComment(commentId, req.user.id, req.user.role);
  }

  @Post('comments/:commentId/pin')
  @ApiOperation({ summary: 'Toggle comment pin (Admin/Facilitator)' })
  toggleCommentPin(@Param('commentId') commentId: string, @Request() req) {
    return this.discussionsService.toggleCommentPin(commentId, req.user.role);
  }

  @Post('comments/:commentId/reactions')
  @ApiOperation({ summary: 'Toggle comment reaction' })
  reactToComment(
    @Param('commentId') commentId: string,
    @Request() req,
    @Body() dto: CommentReactionDto,
  ) {
    return this.discussionsService.reactToComment(commentId, req.user.id, dto.type);
  }

  @Post('comments/:commentId')
  @ApiOperation({ summary: 'Update own comment' })
  updateComment(
    @Param('commentId') commentId: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ) {
    return this.discussionsService.updateComment(commentId, req.user.id, dto);
  }
}
