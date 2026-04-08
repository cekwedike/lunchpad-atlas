import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, PrismaService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
