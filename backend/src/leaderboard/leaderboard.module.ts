import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [NotificationsModule, GamificationModule],
  providers: [LeaderboardService, PrismaService],
  controllers: [LeaderboardController],
})
export class LeaderboardModule {}
