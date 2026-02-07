import { Module } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { PrismaService } from '../prisma.service';
import { DiscussionScoringService } from './discussion-scoring.service';
import { DiscussionsGateway } from './discussions.gateway';

@Module({
  providers: [DiscussionsService, DiscussionScoringService, DiscussionsGateway, PrismaService],
  controllers: [DiscussionsController],
  exports: [DiscussionsService, DiscussionsGateway],
})
export class DiscussionsModule {}
