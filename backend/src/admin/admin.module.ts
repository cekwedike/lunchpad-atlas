import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUserService } from './admin-user.service';
import { GuestFacilitatorScheduler } from './guest-facilitator.scheduler';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { SessionAnalyticsModule } from '../session-analytics/session-analytics.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [NotificationsModule, ChatModule, SessionAnalyticsModule, EmailModule],
  controllers: [AdminController],
  providers: [AdminService, AdminUserService, GuestFacilitatorScheduler, PrismaService],
  exports: [AdminService, AdminUserService],
})
export class AdminModule {}
