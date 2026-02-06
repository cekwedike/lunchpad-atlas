import { Module } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { PrismaService } from '../prisma.service';
import { DiscussionScoringService } from './discussion-scoring.service';

@Module({
  providers: [DiscussionsService, DiscussionScoringService, PrismaService],
  controllers: [DiscussionsController],
  exports: [DiscussionsService],
})
export class DiscussionsModule {}
