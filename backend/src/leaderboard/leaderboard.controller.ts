import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Post,
  Body,
  ForbiddenException,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import {
  LeaderboardFilterDto,
  LeaderboardAdjustPointsDto,
  LeaderboardFellowBreakdownQueryDto,
} from './dto/leaderboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('leaderboard')
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Request() req, @Query() filterDto: LeaderboardFilterDto) {
    return this.leaderboardService.getLeaderboard(req.user.id, req.user.role, filterDto);
  }

  @Get('fellows/:userId/breakdown')
  @ApiOperation({
    summary: 'Monthly points breakdown for a fellow (admin & facilitators)',
  })
  async getFellowPointsBreakdown(
    @Request() req,
    @Param('userId') userId: string,
    @Query() query: LeaderboardFellowBreakdownQueryDto,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FACILITATOR') {
      throw new ForbiddenException('Only admins or facilitators can view points breakdown');
    }
    return this.leaderboardService.getFellowPointsBreakdown(req.user.id, req.user.role, userId, query);
  }

  @Get('rank')
  async getUserRank(@Request() req, @Query() filterDto: LeaderboardFilterDto) {
    return this.leaderboardService.getUserRank(req.user.id, req.user.role, filterDto);
  }

  @Get('months')
  async getAvailableMonths(@Request() req, @Query('cohortId') cohortId?: string) {
    return this.leaderboardService.getAvailableMonths(
      req.user.id,
      req.user.role,
      cohortId,
    );
  }

  @Post('adjust-points')
  async adjustPoints(
    @Request() req,
    @Body() dto: LeaderboardAdjustPointsDto,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'FACILITATOR') {
      throw new ForbiddenException('Only admins or facilitators can adjust leaderboard points');
    }
    return this.leaderboardService.adjustPoints(req.user.id, req.user.role, dto);
  }
}
