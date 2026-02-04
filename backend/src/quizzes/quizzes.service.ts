import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SubmitQuizDto } from './dto/quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async getQuiz(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        session: {
          select: { id: true, title: true },
        },
      },
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

    // Check previous attempts
    const previousAttempts = await this.prisma.quizResponse.count({
      where: { quizId, userId },
    });

    // Award points only on first completion if passed
    const pointsAwarded = passed && previousAttempts === 0 ? quiz.pointValue : 0;

    if (pointsAwarded > 0) {
      await this.prisma.pointsLog.create({
        data: {
          userId,
          points: pointsAwarded,
          eventType: 'QUIZ_SUBMIT',
          description: `Completed quiz: ${quiz.title || 'Quiz'}`,
        },
      });
    }

    // Save response
    const response = await this.prisma.quizResponse.create({
      data: {
        quizId,
        userId,
        answers: dto.answers,
        score,
        passed,
        pointsAwarded,
        completedAt: new Date(),
      },
    });

    return {
      id: response.id,
      userId: response.userId,
      quizId: response.quizId,
      score: response.score,
      passed: response.passed,
      pointsAwarded: response.pointsAwarded,
      completedAt: response.completedAt,
    };
  }
}
