import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto, CreateCommentDto, DiscussionFilterDto } from './dto/discussion.dto';
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

  @Get(':id')
  getDiscussion(@Param('id') id: string) {
    return this.discussionsService.getDiscussion(id);
  }

  @Post()
  createDiscussion(@Request() req, @Body() dto: CreateDiscussionDto) {
    return this.discussionsService.createDiscussion(req.user.id, dto);
  }

  @Post(':id/like')
  likeDiscussion(@Param('id') id: string, @Request() req) {
    return this.discussionsService.likeDiscussion(id, req.user.id);
  }

  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.discussionsService.getComments(id);
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
}
