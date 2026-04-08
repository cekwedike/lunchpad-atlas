import { Injectable } from '@nestjs/common';
import { EventType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

export interface AwardPointsInput {
  userId: string;
  points: number;
  eventType: EventType;
  description: string;
  metadata?: Prisma.InputJsonValue;
  quizId?: string;
  liveQuizId?: string;
  /**
   * When true, skips monthlyPointsCap checks.
   * Use only for explicit admin overrides.
   */
  bypassMonthlyCap?: boolean;
}

export interface AwardPointsResult {
  awarded: boolean;
  capped: boolean;
  monthResetApplied: boolean;
  currentMonthPointsAfter?: number;
  monthlyCap?: number;
  reason?: 'invalid_points' | 'user_not_found' | 'cap_reached';
}

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Awards points with consistent monthly reset + cap enforcement.
   * Always logs to PointsLog when awarded.
   */
  async awardPoints(input: AwardPointsInput): Promise<AwardPointsResult> {
    const pts = Math.trunc(input.points);
    if (!Number.isFinite(pts) || pts === 0) {
      return {
        awarded: false,
        capped: false,
        monthResetApplied: false,
        reason: 'invalid_points',
      };
    }

    const bypass = input.bypassMonthlyCap === true;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          currentMonthPoints: true,
          monthlyPointsCap: true,
          lastPointReset: true,
        },
      });

      if (!user) {
        return {
          awarded: false,
          capped: false,
          monthResetApplied: false,
          reason: 'user_not_found' as const,
        };
      }

      const now = new Date();
      const lastReset = user.lastPointReset;
      const needsReset =
        !lastReset ||
        lastReset.getMonth() !== now.getMonth() ||
        lastReset.getFullYear() !== now.getFullYear();

      const currentMonthPoints = needsReset ? 0 : user.currentMonthPoints;
      const cap = user.monthlyPointsCap ?? 0;

      // Cap only applies to positive-earning awards.
      if (pts > 0 && !bypass && cap > 0 && currentMonthPoints + pts > cap) {
        return {
          awarded: false,
          capped: true,
          monthResetApplied: false,
          currentMonthPointsAfter: currentMonthPoints,
          monthlyCap: cap,
          reason: 'cap_reached' as const,
        };
      }

      const nextMonthPoints = Math.max(0, currentMonthPoints + pts);

      await tx.user.update({
        where: { id: input.userId },
        data: {
          currentMonthPoints: needsReset ? nextMonthPoints : { increment: pts },
          lastPointReset: needsReset ? now : undefined,
        },
      });

      await tx.pointsLog.create({
        data: {
          userId: input.userId,
          points: pts,
          eventType: input.eventType,
          description: input.description,
          ...(input.quizId ? { quizId: input.quizId } : {}),
          ...(input.liveQuizId ? { liveQuizId: input.liveQuizId } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        },
      });

      return {
        awarded: true,
        capped: false,
        monthResetApplied: needsReset,
        currentMonthPointsAfter: nextMonthPoints,
        monthlyCap: cap,
      };
    });
  }
}

