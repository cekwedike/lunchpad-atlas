import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cohorts')
@UseGuards(JwtAuthGuard)
export class CohortsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getCohorts(@Request() req) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, cohortId: true },
    });
    if (!user) return [];
    if (user.role === 'ADMIN') {
      // Admin sees all cohorts
      return await this.prisma.cohort.findMany({});
    }
    if (user.role === 'FACILITATOR') {
      // Facilitator sees cohorts they facilitate (via cohort.facilitatorId or user.cohortId)
      const conditions: any[] = [{ facilitatorId: req.user.id }];
      if (user.cohortId) {
        conditions.push({ id: user.cohortId });
      }
      return await this.prisma.cohort.findMany({
        where: { OR: conditions },
      });
    }
    // Fellow sees only their cohort
    if (user.role === 'FELLOW' && user.cohortId) {
      return await this.prisma.cohort.findMany({
        where: { id: user.cohortId },
      });
    }
    return [];
  }
}
