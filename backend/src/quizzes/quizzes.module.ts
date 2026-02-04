import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [QuizzesService, PrismaService],
  controllers: [QuizzesController],
})
export class QuizzesModule {}
