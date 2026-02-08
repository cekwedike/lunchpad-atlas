import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardFilterDto } from './dto/leaderboard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('leaderboard')
@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Query() filterDto: LeaderboardFilterDto) {
    return this.leaderboardService.getLeaderboard(filterDto);
  }

  @Get('rank')
  async getUserRank(@Request() req, @Query() filterDto: LeaderboardFilterDto) {
    return this.leaderboardService.getUserRank(req.user.id, filterDto);
  }
}
