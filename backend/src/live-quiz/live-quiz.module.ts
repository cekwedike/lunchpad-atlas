import { Module } from '@nestjs/common';
import { LiveQuizController } from './live-quiz.controller';
import { LiveQuizService } from './live-quiz.service';
import { LiveQuizGateway } from './live-quiz.gateway';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [NotificationsModule, AchievementsModule],
  controllers: [LiveQuizController],
  providers: [LiveQuizService, LiveQuizGateway, PrismaService],
  exports: [LiveQuizService],
})
export class LiveQuizModule {}
