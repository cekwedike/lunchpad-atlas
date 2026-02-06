import { Module } from '@nestjs/common';
import { SessionAnalyticsController } from './session-analytics.controller';
import { SessionAnalyticsService } from './session-analytics.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SessionAnalyticsController],
  providers: [SessionAnalyticsService, PrismaService],
  exports: [SessionAnalyticsService],
})
export class SessionAnalyticsModule {}
