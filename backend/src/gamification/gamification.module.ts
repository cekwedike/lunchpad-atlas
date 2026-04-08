import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PointsService } from './points.service';

@Module({
  providers: [PrismaService, PointsService],
  exports: [PointsService],
})
export class GamificationModule {}

