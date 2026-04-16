import type { ReminderDispatchKind } from '@prisma/client';
import { addCalendarDaysYmd } from './weekly-digest-eligibility';

/**
 * Literal dispatch kinds (kept as strings so runtime works even if a hoisted
 * `@prisma/client` install is briefly out of sync with `schema.prisma`).
 */
export const QUIZ_REMINDER_DISPATCH = {
  QUIZ_UNLOCK_EMAIL: 'QUIZ_UNLOCK_EMAIL',
  QUIZ_CLOSING_7D: 'QUIZ_CLOSING_7D',
  QUIZ_CLOSING_3D: 'QUIZ_CLOSING_3D',
  QUIZ_CLOSING_1D: 'QUIZ_CLOSING_1D',
} as const;

/**
 * Quiz closing reminder kinds that apply on `todayYmd` (cohort-local calendar)
 * relative to `closeYmd` and `tomorrowYmd`.
 */
export function quizClosingReminderKindsForToday(
  todayYmd: string,
  tomorrowYmd: string,
  closeYmd: string,
): ReminderDispatchKind[] {
  const kinds: ReminderDispatchKind[] = [];
  if (todayYmd === addCalendarDaysYmd(closeYmd, -7)) {
    kinds.push(QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_7D as ReminderDispatchKind);
  }
  if (todayYmd === addCalendarDaysYmd(closeYmd, -3)) {
    kinds.push(QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_3D as ReminderDispatchKind);
  }
  if (closeYmd === tomorrowYmd) {
    kinds.push(QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_1D as ReminderDispatchKind);
  }
  return kinds;
}

export function daysLeftForQuizClosingKind(kind: ReminderDispatchKind): number {
  const k = kind as string;
  if (k === QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_7D) return 7;
  if (k === QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_3D) return 3;
  if (k === QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_1D) return 1;
  return 0;
}
