import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResourcesModule } from './resources/resources.module';
import { DiscussionsModule } from './discussions/discussions.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AdminModule } from './admin/admin.module';
import { AchievementsModule } from './achievements/achievements.module';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SessionAnalyticsModule } from './session-analytics/session-analytics.module';
import { LiveQuizModule } from './live-quiz/live-quiz.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds
        limit: 100, // 100 requests per minute
      },
    ]),
    AuthModule,
    UsersModule,
    ResourcesModule,
    DiscussionsModule,
    QuizzesModule,
    LeaderboardModule,
    AdminModule,
    AchievementsModule,
    ChatModule,
    NotificationsModule,
    SessionAnalyticsModule,
    LiveQuizModule,
    AttendanceModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
