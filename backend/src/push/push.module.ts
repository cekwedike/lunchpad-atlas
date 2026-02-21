import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PushService } from './push.service';
import { PushController } from './push.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [PushService, PrismaService],
  controllers: [PushController],
  exports: [PushService],
})
export class PushModule {}
