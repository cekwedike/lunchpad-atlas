import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [NotificationsModule, GamificationModule],
  providers: [ChatService, ChatGateway, PrismaService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
