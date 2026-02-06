import { Module } from '@nestjs/common';
import { SessionAnalyticsController } from './session-analytics.controller';
import { SessionAnalyticsService } from './session-analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SessionAnalyticsController],
  providers: [SessionAnalyticsService, AnalyticsExportService, PrismaService],
  exports: [SessionAnalyticsService, AnalyticsExportService],
})
export class SessionAnalyticsModule {}
