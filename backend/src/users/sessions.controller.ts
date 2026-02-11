import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSessions(@Query('cohortId') cohortId?: string) {
    if (!cohortId) return [];
    return this.prisma.session.findMany({
      where: { cohortId },
      orderBy: { sessionNumber: 'asc' },
      include: {
        _count: {
          select: { resources: true },
        },
      },
    });
  }
}
