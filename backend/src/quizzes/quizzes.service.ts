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

    // Check if user would exceed monthly cap
    if (currentMonthPoints + points > user.monthlyPointsCap) {
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

    // All quizzes (SESSION/GENERAL/MEGA) are always stored with cohortId set
    const allQuizzes = await this.prisma.quiz.findMany({
      where: { cohortId },
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
      select: { quizId: true, score: true, completedAt: true },
    });
    const passedSet = new Set(passedResponses.map((r) => r.quizId));

    return allQuizzes.map((quiz: any) => {
      let status: 'UPCOMING' | 'OPEN' | 'CLOSED' | 'COMPLETED';
      if (passedSet.has(quiz.id)) {
        status = 'COMPLETED';
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
    // Formula: if completed in <50% of time limit, +20% bonus
    //          if completed in 50-75% of time limit, +10% bonus
    //          if completed in 75-100% of time limit, 0% bonus
    let timeBonus = 0;
    const timeTaken = dto.timeTaken || 0;
    const timeLimitSeconds = quiz.timeLimit * 60;

    if (timeTaken > 0 && timeTaken < timeLimitSeconds) {
      const timePercentage = timeTaken / timeLimitSeconds;
      if (timePercentage < 0.5) {
        timeBonus = Math.round(quiz.pointValue * 0.2); // 20% bonus
      } else if (timePercentage < 0.75) {
        timeBonus = Math.round(quiz.pointValue * 0.1); // 10% bonus
      }
    }

    // Apply quiz multiplier
    const basePoints = passed ? quiz.pointValue : 0;
    const multipliedPoints = Math.round(basePoints * (quiz.multiplier || 1.0));
    const totalPoints = multipliedPoints + (passed ? timeBonus : 0);

    // Check previous attempts - only award points on first successful attempt
    const previousAttempts = await this.prisma.quizResponse.count({
      where: { quizId, userId, passed: true },
    });

    let pointsAwarded = 0;
    let cappedMessage: string | null = null;

    if (passed && previousAttempts === 0 && totalPoints > 0) {
      // Award points with monthly cap enforcement
      const awarded = await this.awardPoints(
        userId,
        totalPoints,
        'QUIZ_SUBMIT',
        `Passed quiz: ${quiz.title || 'Quiz'} (${score}%)${timeBonus > 0 ? ` +${timeBonus} time bonus` : ''}`,
      );

      if (awarded) {
        pointsAwarded = totalPoints;
      } else {
        cappedMessage = 'Monthly point cap reached - no points awarded';
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
      basePoints: passed ? quiz.pointValue : 0,
      multiplier: quiz.multiplier || 1.0,
      timeBonus,
      totalPoints,
      pointsAwarded,
      cappedMessage,
      timeTaken: response.timeTaken,
      completedAt: response.completedAt,
      newAchievements: newAchievements.length > 0 ? newAchievements : undefined,
    };
  }
}
