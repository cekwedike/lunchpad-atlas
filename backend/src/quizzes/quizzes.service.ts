import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SubmitQuizDto } from './dto/quiz.dto';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class QuizzesService {
  constructor(
    private prisma: PrismaService,
    private achievementsService: AchievementsService,
  ) {}

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
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentMonthPoints: true,
        monthlyPointsCap: true,
        lastPointReset: true,
      },
    });

    if (!user) return false;

    // Check if monthly reset is needed
    const now = new Date();
    const lastReset = user.lastPointReset;
    const needsReset =
      !lastReset ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    let currentMonthPoints = user.currentMonthPoints;
    if (needsReset) {
      currentMonthPoints = 0;
    }

    // Check if user would exceed monthly cap (skipped for mega quiz tiered rewards)
    if (!bypassCap && currentMonthPoints + points > user.monthlyPointsCap) {
      return false; // Cap reached, no points awarded
    }

    // Award points
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        currentMonthPoints: needsReset ? points : { increment: points },
        lastPointReset: needsReset ? now : undefined,
      },
    });

    // Log points
    await this.prisma.pointsLog.create({
      data: {
        userId,
        points,
        eventType: eventType as any,
        description,
      },
    });

    return true;
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

      let status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'LOCKED';
      if (passedSet.has(quiz.id)) {
        status = 'COMPLETED';
      } else if (allAttemptsUsed) {
        status = 'LOCKED';
      } else if (quiz.closeAt && quiz.closeAt < now) {
        status = 'CLOSED';
      } else if (quiz.openAt && quiz.openAt > now) {
        status = 'UPCOMING';
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

  async getQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        sessions: {
          include: { session: { select: { id: true, title: true, sessionNumber: true } } },
        },
      } as any,
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async getQuizQuestions(quizId: string) {
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
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

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
    });

    // Calculate score
    let correctCount = 0;

    for (const question of questions) {
      const userAnswer = dto.answers[question.id];
      if (userAnswer === question.correctAnswer) {
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
        answers: dto.answers,
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
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

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

    const reviewQuestions = questions.map((q) => {
      const userAnswer = userAnswers[q.id] ?? null;
      const isCorrect = userAnswer === q.correctAnswer;
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
