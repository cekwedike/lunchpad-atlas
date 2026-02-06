import { Module } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { ResourcesController } from './resources.controller';
import { EnhancedEngagementService } from './enhanced-engagement.service';
import { PrismaService } from '../prisma.service';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [AchievementsModule],
  providers: [ResourcesService, EnhancedEngagementService, PrismaService],
  controllers: [ResourcesController],
  exports: [EnhancedEngagementService],
})
export class ResourcesModule {}
