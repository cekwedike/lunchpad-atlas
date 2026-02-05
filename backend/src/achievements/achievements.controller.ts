import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('achievements')
@Controller('achievements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AchievementsController {
  constructor(private achievementsService: AchievementsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available achievements' })
  @ApiResponse({ status: 200, description: 'List of all achievements' })
  getAllAchievements() {
    return this.achievementsService.getAllAchievements();
  }

  @Get('my')
  @ApiOperation({ summary: "Get current user's unlocked achievements" })
  @ApiResponse({ status: 200, description: "User's achievements retrieved" })
  getMyAchievements(@Request() req) {
    return this.achievementsService.getUserAchievements(req.user.id);
  }
}
