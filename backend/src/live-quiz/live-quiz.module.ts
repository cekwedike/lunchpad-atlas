import { Module } from '@nestjs/common';
import { LiveQuizController } from './live-quiz.controller';
import { LiveQuizService } from './live-quiz.service';
import { LiveQuizGateway } from './live-quiz.gateway';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [LiveQuizController],
  providers: [LiveQuizService, LiveQuizGateway, PrismaService],
  exports: [LiveQuizService],
})
export class LiveQuizModule {}
