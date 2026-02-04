import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResourcesModule } from './resources/resources.module';
import { DiscussionsModule } from './discussions/discussions.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

@Module({
  imports: [AuthModule, UsersModule, ResourcesModule, DiscussionsModule, QuizzesModule, LeaderboardModule],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
