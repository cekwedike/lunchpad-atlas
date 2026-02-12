import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUserService } from './admin-user.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { SessionAnalyticsModule } from '../session-analytics/session-analytics.module';

@Module({
  imports: [NotificationsModule, ChatModule, SessionAnalyticsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminUserService, PrismaService],
  exports: [AdminService, AdminUserService],
})
export class AdminModule {}
