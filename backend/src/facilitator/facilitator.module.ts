import { Module } from '@nestjs/common';
import { FacilitatorController } from './facilitator.controller';
import { FacilitatorService } from './facilitator.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [FacilitatorController],
  providers: [FacilitatorService, PrismaService],
})
export class FacilitatorModule {}
