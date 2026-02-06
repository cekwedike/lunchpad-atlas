import { Module } from '@nestjs/common';
import { LiveQuizController } from './live-quiz.controller';
import { LiveQuizService } from './live-quiz.service';
import { LiveQuizGateway } from './live-quiz.gateway';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LiveQuizController],
  providers: [LiveQuizService, LiveQuizGateway, PrismaService],
  exports: [LiveQuizService],
})
export class LiveQuizModule {}
