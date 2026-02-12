import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionAnalyticsController } from './session-analytics.controller';
import { SessionAnalyticsService } from './session-analytics.service';
import { AnalyticsExportService } from './analytics-export.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [SessionAnalyticsController],
  providers: [SessionAnalyticsService, AnalyticsExportService, PrismaService],
  exports: [SessionAnalyticsService, AnalyticsExportService],
})
export class SessionAnalyticsModule {}
