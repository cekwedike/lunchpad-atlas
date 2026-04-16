import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { PrismaService } from '../prisma.service';
import { AchievementsModule } from '../achievements/achievements.module';
import { GamificationModule } from '../gamification/gamification.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuizUnlockNotificationService } from './quiz-unlock-notification.service';

@Module({
  imports: [
    AchievementsModule,
    GamificationModule,
    EmailModule,
    NotificationsModule,
  ],
  providers: [QuizzesService, QuizUnlockNotificationService, PrismaService],
  controllers: [QuizzesController],
  exports: [QuizUnlockNotificationService],
})
export class QuizzesModule {}
