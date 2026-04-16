import { Injectable, Logger } from '@nestjs/common';
import {
  CohortState,
  NotificationType,
  ReminderDispatchKind,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { isCohortInActiveWeeklyDigestWindow } from '../cron/weekly-digest-eligibility';

export type QuizUnlockEmailQuiz = {
  id: string;
  title: string;
  openAt: Date | null;
  closeAt: Date | null;
};

/**
 * Quiz unlock emails + in-app QUIZ_UNLOCKED notifications, deduped via ReminderDispatch.
 * Shared by the daily cron (calendar-day match) and admin save (immediate when openAt <= now).
 */
@Injectable()
export class QuizUnlockNotificationService {
  private readonly logger = new Logger(QuizUnlockNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Sends at most one unlock email per fellow per quiz (ReminderDispatch dedupe).
   */
  async sendUnlockEmailsToFellows(
    quiz: QuizUnlockEmailQuiz,
    fellows: { id: string; email: string | null; firstName: string | null }[],
  ): Promise<void> {
    for (const fellow of fellows) {
      const email = fellow.email?.trim();
      if (!email) continue;

      try {
        const dispatched = await this.prisma.reminderDispatch.findUnique({
          where: {
            kind_userId_entityId: {
              kind: ReminderDispatchKind.QUIZ_UNLOCK_EMAIL,
              userId: fellow.id,
              entityId: quiz.id,
            },
          },
        });
        if (dispatched) continue;

        const sent = await this.emailService.sendQuizUnlockedEmail(email, {
          firstName: fellow.firstName || 'there',
          quizTitle: quiz.title,
          quizId: quiz.id,
          closeAt: quiz.closeAt,
        });
        if (!sent) continue;

        await this.prisma.reminderDispatch.create({
          data: {
            kind: ReminderDispatchKind.QUIZ_UNLOCK_EMAIL,
            userId: fellow.id,
            entityId: quiz.id,
          },
        });

        const closeNote = quiz.closeAt
          ? ` Complete it by ${quiz.closeAt.toLocaleDateString()}.`
          : '';
        await this.notificationsService.createNotification({
          userId: fellow.id,
          type: NotificationType.QUIZ_UNLOCKED,
          title: 'Quiz now open',
          message: `"${quiz.title}" is now available.${closeNote}`,
          data: { quizId: quiz.id, dueDate: quiz.closeAt },
        });
      } catch (err) {
        this.logger.warn(
          `Quiz unlock notify failed for user ${fellow.id} quiz ${quiz.id}: ${err}`,
        );
      }
    }
  }

  /**
   * After a quiz is saved with `openAt` in the past or present, notify fellows without
   * waiting for the next 07:00 UTC cron run. Skips future `openAt`.
   */
  async sendUnlockEmailsWhenQuizOpen(quizId: string): Promise<void> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        openAt: true,
        closeAt: true,
        cohortId: true,
        sessions: { select: { session: { select: { cohortId: true } } } },
      },
    });

    if (!quiz?.openAt) return;
    if (quiz.openAt.getTime() > Date.now()) return;

    const cohortIds = new Set<string>();
    if (quiz.cohortId) cohortIds.add(quiz.cohortId);
    for (const row of quiz.sessions) {
      if (row.session?.cohortId) cohortIds.add(row.session.cohortId);
    }
    if (cohortIds.size === 0) {
      this.logger.warn(
        `Quiz ${quizId} has no cohort link — skip immediate unlock emails`,
      );
      return;
    }

    const now = new Date();
    const payload: QuizUnlockEmailQuiz = {
      id: quiz.id,
      title: quiz.title,
      openAt: quiz.openAt,
      closeAt: quiz.closeAt,
    };

    for (const cohortId of cohortIds) {
      const cohort = await this.prisma.cohort.findUnique({
        where: { id: cohortId },
        select: {
          id: true,
          state: true,
          startDate: true,
          endDate: true,
          timeZone: true,
        },
      });
      if (!cohort || cohort.state !== CohortState.ACTIVE) continue;
      if (!isCohortInActiveWeeklyDigestWindow(cohort, now)) continue;

      const fellows = await this.prisma.user.findMany({
        where: { cohortId, role: 'FELLOW', isSuspended: false },
        select: { id: true, email: true, firstName: true },
      });
      if (fellows.length === 0) continue;

      await this.sendUnlockEmailsToFellows(payload, fellows);
    }
  }
}
