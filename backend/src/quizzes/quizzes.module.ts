import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { PrismaService } from '../prisma.service';
import { AchievementsModule } from '../achievements/achievements.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [AchievementsModule, GamificationModule],
  providers: [QuizzesService, PrismaService],
  controllers: [QuizzesController],
})
export class QuizzesModule {}
