import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CohortsController } from './cohorts.controller';
import { SessionsController } from './sessions.controller';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [UsersService, PrismaService],
  controllers: [UsersController, CohortsController, SessionsController],
  exports: [UsersService],
})
export class UsersModule {}
