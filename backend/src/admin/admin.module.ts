import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminUserService } from './admin-user.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminUserService, PrismaService],
  exports: [AdminService, AdminUserService],
})
export class AdminModule {}
