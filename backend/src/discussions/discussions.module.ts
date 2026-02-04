import { Module } from '@nestjs/common';
import { DiscussionsService } from './discussions.service';
import { DiscussionsController } from './discussions.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [DiscussionsService, PrismaService],
  controllers: [DiscussionsController],
})
export class DiscussionsModule {}
