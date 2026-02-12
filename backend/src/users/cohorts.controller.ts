import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const COHORT_INCLUDE = {
  _count: { select: { sessions: true } },
  facilitator: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

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

    let cohorts: any[];

    if (user.role === 'ADMIN') {
      cohorts = await this.prisma.cohort.findMany({
        include: COHORT_INCLUDE,
        orderBy: { startDate: 'desc' },
      });
    } else if (user.role === 'FACILITATOR') {
      const conditions: any[] = [{ facilitatorId: req.user.id }];
      if (user.cohortId) conditions.push({ id: user.cohortId });
      cohorts = await this.prisma.cohort.findMany({
        where: { OR: conditions },
        include: COHORT_INCLUDE,
        orderBy: { startDate: 'desc' },
      });
    } else if (user.role === 'FELLOW' && user.cohortId) {
      cohorts = await this.prisma.cohort.findMany({
        where: { id: user.cohortId },
        include: COHORT_INCLUDE,
      });
    } else {
      return [];
    }

    if (cohorts.length === 0) return cohorts;

    // Compute accurate fellow count per cohort via groupBy
    const cohortIds = cohorts.map((c) => c.id);
    const fellowCounts = await this.prisma.user.groupBy({
      by: ['cohortId'],
      where: { cohortId: { in: cohortIds }, role: 'FELLOW' },
      _count: { id: true },
    });
    const countMap: Record<string, number> = Object.fromEntries(
      fellowCounts.map((c) => [c.cohortId, c._count.id]),
    );

    return cohorts.map((cohort) => ({
      ...cohort,
      _count: { ...cohort._count, fellows: countMap[cohort.id] ?? 0 },
    }));
  }
}
