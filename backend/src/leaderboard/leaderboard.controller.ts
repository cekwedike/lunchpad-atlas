import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardFilterDto } from './dto/leaderboard.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Query() filterDto: LeaderboardFilterDto) {
    return this.leaderboardService.getLeaderboard(filterDto);
  }

  @Get('rank')
  async getUserRank(
    @Request() req,
    @Query() filterDto: LeaderboardFilterDto,
  ) {
    return this.leaderboardService.getUserRank(req.user.userId, filterDto);
  }
}
