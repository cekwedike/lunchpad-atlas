import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [LeaderboardService, PrismaService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
