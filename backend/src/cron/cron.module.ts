import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  providers: [CronService, PrismaService],
})
export class CronModule {}
