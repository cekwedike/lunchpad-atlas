import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaService } from '../prisma.service';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuizzesModule } from '../quizzes/quizzes.module';

@Module({
  imports: [EmailModule, NotificationsModule, QuizzesModule],
  providers: [CronService, PrismaService],
})
export class CronModule {}
