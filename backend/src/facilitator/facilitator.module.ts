import { Module } from '@nestjs/common';
import { FacilitatorController } from './facilitator.controller';
import { FacilitatorService } from './facilitator.service';
import { PrismaService } from '../prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [FacilitatorController],
  providers: [FacilitatorService, PrismaService],
})
export class FacilitatorModule {}
