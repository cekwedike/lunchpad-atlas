import {
  daysLeftForQuizClosingKind,
  quizClosingReminderKindsForToday,
  QUIZ_REMINDER_DISPATCH,
} from './quiz-reminder-stages';

describe('quizClosingReminderKindsForToday', () => {
  it('returns 7d on the calendar day one week before close', () => {
    const closeYmd = '2026-06-15';
    const todayYmd = '2026-06-08';
    const tomorrowYmd = '2026-06-09';
    expect(quizClosingReminderKindsForToday(todayYmd, tomorrowYmd, closeYmd)).toEqual([
      QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_7D,
    ]);
  });

  it('returns 3d three days before close', () => {
    const closeYmd = '2026-06-15';
    const todayYmd = '2026-06-12';
    const tomorrowYmd = '2026-06-13';
    expect(quizClosingReminderKindsForToday(todayYmd, tomorrowYmd, closeYmd)).toEqual([
      QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_3D,
    ]);
  });

  it('returns 1d when close is tomorrow', () => {
    const closeYmd = '2026-06-10';
    const todayYmd = '2026-06-09';
    const tomorrowYmd = '2026-06-10';
    expect(quizClosingReminderKindsForToday(todayYmd, tomorrowYmd, closeYmd)).toEqual([
      QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_1D,
    ]);
  });

  it('returns each stage at most once per day (no duplicate kinds)', () => {
    const kinds = quizClosingReminderKindsForToday(
      '2026-06-08',
      '2026-06-09',
      '2026-06-15',
    );
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

describe('daysLeftForQuizClosingKind', () => {
  it('maps kinds to day counts', () => {
    expect(daysLeftForQuizClosingKind(QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_7D)).toBe(7);
    expect(daysLeftForQuizClosingKind(QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_3D)).toBe(3);
    expect(daysLeftForQuizClosingKind(QUIZ_REMINDER_DISPATCH.QUIZ_CLOSING_1D)).toBe(1);
  });
});
