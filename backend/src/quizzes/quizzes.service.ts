import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SubmitQuizDto } from './dto/quiz.dto';
import { AchievementsService } from '../achievements/achievements.service';
import { normalizeQuizAnswer } from '../common/quiz-answer';
import { resolveStoredAnswerForQuestion } from '../common/quiz-stored-answers';
import { UserRole } from '@prisma/client';
import { PointsService } from '../gamification/points.service';

@Injectable()
export class QuizzesService {
  constructor(
    private prisma: PrismaService,
    private achievementsService: AchievementsService,
    private pointsService: PointsService,
  ) {}

  private async assertUserCanAccessQuiz(
    userId: string,
    quiz: {
      cohortId: string | null;
      sessions: Array<{
        sessionId: string;
        session: { cohortId: string } | null;
      }>;
    },
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, cohortId: true },
    });
    if (!user) throw new ForbiddenException('User not found');
    if (user.role === UserRole.ADMIN) return;

    const quizCohortIds = new Set<string>();
    if (quiz.cohortId) quizCohortIds.add(quiz.cohortId);
    for (const qs of quiz.sessions) {
      const cid = qs.session?.cohortId;
      if (cid) quizCohortIds.add(cid);
    }

    if (user.role === UserRole.FELLOW) {
      if (!user.cohortId || !quizCohortIds.has(user.cohortId)) {
        throw new ForbiddenException('You are not assigned to this quiz');
      }
      return;
    }

    if (user.role === UserRole.FACILITATOR) {
      const links = await this.prisma.cohortFacilitator.findMany({
        where: { userId },
        select: { cohortId: true },
      });
      const mine = new Set(links.map((l) => l.cohortId));
      const ok = [...quizCohortIds].some((cid) => mine.has(cid));
      if (!ok) throw new ForbiddenException('You are not assigned to this quiz');
      return;
    }

    if (user.role === UserRole.GUEST_FACILITATOR) {
      const sessionIds = quiz.sessions.map((s) => s.sessionId);
      if (sessionIds.length === 0) {
        throw new ForbiddenException('You are not assigned to this quiz');
      }
      const guest = await this.prisma.guestSession.findFirst({
        where: { userId, sessionId: { in: sessionIds } },
      });
      if (!guest) throw new ForbiddenException('You are not assigned to this quiz');
      return;
    }

    throw new ForbiddenException('You are not assigned to this quiz');
  }

  /**
   * Helper function to award points with monthly cap enforcement
   * Returns true if points were awarded, false if cap reached
   */
  private async awardPoints(
    userId: string,
    points: number,
    eventType: string,
    description: string,
    bypassCap = false,
    quizId?: string,
  ): Promise<boolean> {
    const result = await this.pointsService.awardPoints({
      userId,
      points,
      eventType: eventType as any,
      description,
      bypassMonthlyCap: bypassCap,
      quizId,
    });
    return result.awarded;
  }

  async getMyQuizzes(userId: string) {
    // Find user's cohort
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true },
    });

    if (!user?.cohortId) {
      return [];
    }

    const cohortId = user.cohortId;
    const now = new Date();

    // Include quizzes directly assigned to this cohort OR linked via sessions
    const allQuizzes = await this.prisma.quiz.findMany({
      where: {
        OR: [
          { cohortId },
          { sessions: { some: { session: { cohortId } } } },
        ],
      },
      include: {
        sessions: {
          include: { session: { select: { id: true, title: true, sessionNumber: true } } },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch user's passed attempts for these quizzes
    const quizIds = allQuizzes.map((q) => q.id);
    const passedResponses = await this.prisma.quizResponse.findMany({
      where: { userId, quizId: { in: quizIds }, passed: true },
      select: { quizId: true },
    });
    const passedSet = new Set(passedResponses.map((r) => r.quizId));

    // Fetch attempt counts for all quizzes (for LOCKED status + display)
    const attemptGroups = await this.prisma.quizResponse.groupBy({
      by: ['quizId'],
      where: { userId, quizId: { in: quizIds } },
      _count: { id: true },
    });
    const attemptCountMap = new Map(attemptGroups.map((r) => [r.quizId, r._count.id]));

    return allQuizzes.map((quiz: any) => {
      const attemptCount = attemptCountMap.get(quiz.id) ?? 0;
      const maxAttempts = quiz.maxAttempts as number;
      const allAttemptsUsed = maxAttempts > 0 && attemptCount >= maxAttempts;

      let status: 'UPCOMING' | 'OPEN' | 'ATTEMPTED' | 'CLOSED' | 'COMPLETED' | 'LOCKED';
      if (passedSet.has(quiz.id)) {
        status = 'COMPLETED';
      } else if (allAttemptsUsed) {
        status = 'LOCKED';
      } else if (quiz.closeAt && quiz.closeAt < now) {
        status = 'CLOSED';
      } else if (quiz.openAt && quiz.openAt > now) {
        status = 'UPCOMING';
      } else if (attemptCount > 0) {
        status = 'ATTEMPTED'; // open window, has tries, not passed, not maxed out
      } else {
        status = 'OPEN';
      }

      return {
        ...quiz,
        status,
        attemptCount,
      };
    });
  }

  async getQuiz(id: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        sessions: {
          include: { session: { select: { id: true, title: true, sessionNumber: true, cohortId: true } } },
        },
      } as any,
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.assertUserCanAccessQuiz(userId, quiz as any);

    return quiz;
  }

  async getQuizQuestions(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        sessions: {
          include: { session: { select: { cohortId: true } } },
        },
      },
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    await this.assertUserCanAccessQuiz(userId, quiz);

    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        quizId: true,
        question: true,
        options: true,
        order: true,
      },
    });

    return questions;
  }

  async getQuizAttempts(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        sessions: { include: { session: { select: { cohortId: true } } } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    await this.assertUserCanAccessQuiz(userId, quiz);

    return this.prisma.quizResponse.findMany({
      where: { quizId, userId },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        score: true,
        passed: true,
        pointsAwarded: true,
        completedAt: true,
      },
    });
  }

  async submitQuiz(quizId: string, userId: string, dto: SubmitQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        sessions: { include: { session: { select: { cohortId: true } } } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.assertUserCanAccessQuiz(userId, quiz);

    // Enforce max attempt limit (0 = unlimited)
    const totalAllAttempts = await this.prisma.quizResponse.count({
      where: { quizId, userId },
    });
    const maxAttempts = (quiz as any).maxAttempts as number;
    if (maxAttempts > 0 && totalAllAttempts >= maxAttempts) {
      throw new BadRequestException('Maximum attempts reached for this quiz');
    }

    // Attempt number determines points reduction (1-indexed)
    const attemptNumber = totalAllAttempts + 1;

    // Get questions with correct answers
    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { order: 'asc' },
    });

    if (questions.length === 0) {
      throw new BadRequestException('This quiz has no questions');
    }

    const incoming = dto.answers && typeof dto.answers === 'object' ? dto.answers : {};
    /** One entry per current question id so DB always matches the live question set. */
    const mergedAnswers: Record<string, string> = {};
    for (const q of questions) {
      const v = incoming[q.id];
      mergedAnswers[q.id] = v == null ? '' : String(v);
    }
    const hasAnyDirectHit = questions.some(
      (q) => Object.prototype.hasOwnProperty.call(incoming, q.id),
    );
    const vals = Object.values(incoming);
    if (
      !hasAnyDirectHit &&
      vals.length === questions.length &&
      vals.length > 0
    ) {
      // Client sent answers keyed by a previous question-id revision — map by index
      questions.forEach((q, i) => {
        mergedAnswers[q.id] = vals[i] == null ? '' : String(vals[i]);
      });
    }

    // Calculate score (normalize answers to avoid whitespace / formatting mismatches)
    let correctCount = 0;

    for (const question of questions) {
      const userAnswer = mergedAnswers[question.id];
      if (
        normalizeQuizAnswer(userAnswer) ===
        normalizeQuizAnswer(question.correctAnswer)
      ) {
        correctCount++;
      }
    }

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.passingScore;

    // Calculate time bonus (faster completion = more points)
    let timeBonus = 0;
    const timeTaken = dto.timeTaken || 0;
    const timeLimitSeconds = quiz.timeLimit * 60;

    if (timeTaken > 0 && timeLimitSeconds > 0 && timeTaken < timeLimitSeconds) {
      const timePercentage = timeTaken / timeLimitSeconds;
      if (timePercentage < 0.5) {
        timeBonus = Math.round(quiz.pointValue * 0.2);
      } else if (timePercentage < 0.75) {
        timeBonus = Math.round(quiz.pointValue * 0.1);
      }
    }

    // Apply quiz multiplier
    const basePoints = passed ? quiz.pointValue : 0;
    const multipliedPoints = Math.round(basePoints * (quiz.multiplier || 1.0));

    // Retry points reduction: each subsequent attempt halves the points
    // Attempt 1: ×1.0 | Attempt 2: ×0.5 | Attempt 3: ×0.25 | ...
    const retryMultiplier = 1 / Math.pow(2, attemptNumber - 1);
    const totalPoints = Math.round((multipliedPoints + (passed ? timeBonus : 0)) * retryMultiplier);

    // Check previous passed attempts - only award points on first successful attempt
    const previousPassedAttempts = await this.prisma.quizResponse.count({
      where: { quizId, userId, passed: true },
    });

    let pointsAwarded = 0;
    let cappedMessage: string | null = null;
    let megaQuizRank: number | undefined;
    let totalMegaSubmissions: number | undefined;

    // Compute attemptsRemaining (null = unlimited)
    const attemptsRemaining = maxAttempts > 0 ? maxAttempts - attemptNumber : null;

    if (passed && previousPassedAttempts === 0) {
      if ((quiz as any).quizType === 'MEGA') {
        // MEGA quiz: tiered leaderboard points based on rank among all passing submissions
        const higherScores = await this.prisma.quizResponse.count({
          where: { quizId, passed: true, score: { gt: score } },
        });
        const allPassingCount = await this.prisma.quizResponse.count({
          where: { quizId, passed: true },
        });
        megaQuizRank = higherScores + 1;
        totalMegaSubmissions = allPassingCount + 1;

        const tieredPoints =
          megaQuizRank === 1 ? 3000 :
          megaQuizRank === 2 ? 2000 :
          megaQuizRank === 3 ? 1000 :
          megaQuizRank <= 7  ? 500  : 200;

        const awarded = await this.awardPoints(
          userId,
          tieredPoints,
          'QUIZ_SUBMIT',
          `Mega Quiz: ${quiz.title} - Rank #${megaQuizRank} (score: ${score}%)`,
          true,
          quizId,
        );

        if (awarded) {
          pointsAwarded = tieredPoints;
        }
      } else if (totalPoints > 0) {
        // Regular SESSION/GENERAL quiz
        const retryNote = attemptNumber > 1 ? ` (attempt ${attemptNumber}, ${Math.round(retryMultiplier * 100)}% points)` : '';
        const awarded = await this.awardPoints(
          userId,
          totalPoints,
          'QUIZ_SUBMIT',
          `Passed quiz: ${quiz.title || 'Quiz'} (${score}%)${timeBonus > 0 ? ` +${timeBonus} time bonus` : ''}${retryNote}`,
          false,
          quizId,
        );

        if (awarded) {
          pointsAwarded = totalPoints;
        } else {
          cappedMessage = 'Monthly point cap reached - no points awarded';
        }
      }
    }

    // Save response with time tracking
    const response = await this.prisma.quizResponse.create({
      data: {
        quizId,
        userId,
        answers: mergedAnswers,
        score,
        passed,
        pointsAwarded,
        timeTaken: dto.timeTaken || 0,
        timeBonus,
        completedAt: new Date(),
      },
    });

    // Check and award achievements if quiz was passed
    let newAchievements: any[] = [];
    if (passed) {
      newAchievements =
        await this.achievementsService.checkAndAwardAchievements(userId);
    }

    return {
      id: response.id,
      userId: response.userId,
      quizId: response.quizId,
      score: response.score,
      passed: response.passed,
      quizType: (quiz as any).quizType,
      basePoints: passed ? quiz.pointValue : 0,
      multiplier: quiz.multiplier || 1.0,
      retryMultiplier,
      attemptNumber,
      maxAttempts,
      attemptsRemaining,
      timeBonus,
      totalPoints,
      pointsAwarded,
      cappedMessage,
      megaQuizRank,
      totalMegaSubmissions,
      timeTaken: response.timeTaken,
      completedAt: response.completedAt,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
    };
  }

  async getQuizReview(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        sessions: { include: { session: { select: { cohortId: true } } } },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.assertUserCanAccessQuiz(userId, quiz);

    // Get the user's most recent attempt
    const latestAttempt = await this.prisma.quizResponse.findFirst({
      where: { quizId, userId },
      orderBy: { completedAt: 'desc' },
    });

    if (!latestAttempt) {
      throw new NotFoundException('No attempts found for this quiz');
    }

    // Get all questions with correct answers
    const questions = await this.prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { order: 'asc' },
    });

    const userAnswers = (latestAttempt.answers as Record<string, string>) || {};
    const showCorrectAnswers = (quiz as any).showCorrectAnswers as boolean;

    const reviewQuestions = questions.map((q, i) => {
      const userAnswer = resolveStoredAnswerForQuestion(
        questions,
        i,
        q.id,
        userAnswers,
      );
      const isCorrect =
        normalizeQuizAnswer(userAnswer) === normalizeQuizAnswer(q.correctAnswer);
      return {
        id: q.id,
        question: q.question,
        options: q.options,
        userAnswer,
        isCorrect,
        ...(showCorrectAnswers && { correctAnswer: q.correctAnswer }),
      };
    });

    return {
      showCorrectAnswers,
      questions: reviewQuestions,
      attempt: {
        score: latestAttempt.score,
        passed: latestAttempt.passed,
        completedAt: latestAttempt.completedAt,
      },
    };
  }
}
