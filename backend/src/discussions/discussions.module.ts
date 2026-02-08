import { Module } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { PrismaService } from '../prisma.service';
import { DiscussionScoringService } from './discussion-scoring.service';
import { DiscussionsGateway } from './discussions.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [
    DiscussionsService,
    DiscussionScoringService,
    DiscussionsGateway,
    PrismaService,
  ],
  controllers: [DiscussionsController],
  exports: [DiscussionsService, DiscussionsGateway],
})
export class DiscussionsModule {}
