import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateLiveQuizDto,
  JoinLiveQuizDto,
  SubmitAnswerDto,
} from './dto/live-quiz.dto';

@Injectable()
export class LiveQuizService {
  constructor(private prisma: PrismaService) {}

  // Create a new live quiz
  async create(createDto: CreateLiveQuizDto) {
    const quiz = await (this.prisma.liveQuiz as any).create({
      data: {
        title: createDto.title,
        description: createDto.description,
        totalQuestions: createDto.questions.length,
        timePerQuestion: createDto.timePerQuestion || 30,
        sessions: {
          create: createDto.sessionIds.map((sessionId) => ({ sessionId })),
        },
        questions: {
          create: createDto.questions.map((q, index) => ({
            questionText: q.questionText,
            options: q.options as any,
            correctAnswer: q.correctAnswer,
            orderIndex: index,
            timeLimit: q.timeLimit || createDto.timePerQuestion || 30,
            pointValue: q.pointValue || 1000,
          })),
        },
      },
      include: {
        sessions: { include: { session: { select: { id: true, title: true } } } },
        questions: { orderBy: { orderIndex: 'asc' } },
      },
    });

    return quiz;
  }

  // Get quiz by ID
  async findOne(id: string) {
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
        participants: {
          orderBy: { totalScore: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(`Live quiz with ID ${id} not found`);
    }

    return quiz;
  }

  // Get all live quizzes for a cohort
  async findByCohort(cohortId: string) {
    return (this.prisma.liveQuiz as any).findMany({
      where: {
        sessions: {
          some: { session: { cohortId } },
        },
      },
      include: {
        sessions: { include: { session: { select: { id: true, title: true, sessionNumber: true } } } },
        questions: { orderBy: { orderIndex: 'asc' } },
        participants: { take: 10, orderBy: { totalScore: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get all quizzes for a session
  async findBySession(sessionId: string) {
    return (this.prisma.liveQuiz as any).findMany({
      where: { sessions: { some: { sessionId } } },
      include: {
        sessions: { include: { session: { select: { id: true, title: true } } } },
        questions: { orderBy: { orderIndex: 'asc' } },
        participants: { take: 10, orderBy: { totalScore: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Start a quiz
  async startQuiz(id: string) {
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException(`Live quiz with ID ${id} not found`);
    }

    if (quiz.status !== 'PENDING') {
      throw new BadRequestException('Quiz has already been started');
    }

    return this.prisma.liveQuiz.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
        currentQuestion: 0,
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  // Move to next question
  async nextQuestion(id: string, questionIndex: number) {
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id },
      include: { questions: true },
    });

    if (!quiz) {
      throw new NotFoundException(`Live quiz with ID ${id} not found`);
    }

    if (questionIndex >= quiz.questions.length) {
      // Quiz completed
      return this.completeQuiz(id);
    }

    return this.prisma.liveQuiz.update({
      where: { id },
      data: { currentQuestion: questionIndex },
    });
  }

  // Complete quiz and calculate final rankings
  async completeQuiz(id: string) {
    const participants = await this.prisma.liveQuizParticipant.findMany({
      where: { liveQuizId: id },
      orderBy: { totalScore: 'desc' },
    });

    // Update ranks
    await Promise.all(
      participants.map((participant, index) =>
        this.prisma.liveQuizParticipant.update({
          where: { id: participant.id },
          data: { rank: index + 1 },
        }),
      ),
    );

    return this.prisma.liveQuiz.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
      include: {
        participants: {
          orderBy: { totalScore: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  // Join a quiz
  async joinQuiz(quizId: string, joinDto: JoinLiveQuizDto) {
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException(`Live quiz with ID ${quizId} not found`);
    }

    if (quiz.status === 'COMPLETED' || quiz.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot join a completed or cancelled quiz',
      );
    }

    // Check if already joined
    const existing = await this.prisma.liveQuizParticipant.findUnique({
      where: {
        liveQuizId_userId: {
          liveQuizId: quizId,
          userId: joinDto.userId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.liveQuizParticipant.create({
      data: {
        liveQuizId: quizId,
        userId: joinDto.userId,
        displayName: joinDto.displayName,
      },
    });
  }

  // Submit an answer
  async submitAnswer(submitDto: SubmitAnswerDto) {
    const [participant, question] = await Promise.all([
      this.prisma.liveQuizParticipant.findUnique({
        where: { id: submitDto.participantId },
      }),
      this.prisma.liveQuizQuestion.findUnique({
        where: { id: submitDto.questionId },
      }),
    ]);

    if (!participant || !question) {
      throw new NotFoundException('Participant or question not found');
    }

    // Check if already answered
    const existingAnswer = await this.prisma.liveQuizAnswer.findUnique({
      where: {
        participantId_questionId: {
          participantId: submitDto.participantId,
          questionId: submitDto.questionId,
        },
      },
    });

    if (existingAnswer) {
      throw new BadRequestException('Already answered this question');
    }

    const isCorrect = submitDto.selectedAnswer === question.correctAnswer;
    const pointsEarned = this.calculatePoints(
      isCorrect,
      question.pointValue,
      submitDto.timeToAnswer,
      question.timeLimit,
    );

    // Create answer
    const answer = await this.prisma.liveQuizAnswer.create({
      data: {
        participantId: submitDto.participantId,
        questionId: submitDto.questionId,
        selectedAnswer: submitDto.selectedAnswer,
        isCorrect,
        timeToAnswer: submitDto.timeToAnswer,
        pointsEarned,
      },
    });

    // Update participant stats
    const newStreak = isCorrect ? participant.streak + 1 : 0;
    const streakBonus = newStreak >= 3 ? Math.floor(newStreak / 3) * 100 : 0;

    await this.prisma.liveQuizParticipant.update({
      where: { id: participant.id },
      data: {
        totalScore: { increment: pointsEarned + streakBonus },
        correctCount: isCorrect ? { increment: 1 } : undefined,
        streak: newStreak,
      },
    });

    return {
      ...answer,
      streakBonus,
      newStreak,
    };
  }

  // Calculate points with time bonus
  private calculatePoints(
    isCorrect: boolean,
    basePoints: number,
    timeToAnswer: number,
    timeLimit: number,
  ): number {
    if (!isCorrect) return 0;

    const timeInSeconds = timeToAnswer / 1000;
    const percentageTimeLeft = Math.max(
      0,
      (timeLimit - timeInSeconds) / timeLimit,
    );
    const timeBonus = Math.floor(basePoints * 0.5 * percentageTimeLeft); // Up to 50% bonus

    return basePoints + timeBonus;
  }

  // Get leaderboard
  async getLeaderboard(quizId: string) {
    return this.prisma.liveQuizParticipant.findMany({
      where: { liveQuizId: quizId },
      orderBy: [{ totalScore: 'desc' }, { joinedAt: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        answers: {
          select: {
            isCorrect: true,
            pointsEarned: true,
          },
        },
      },
    });
  }

  // Get participant's answers
  async getParticipantAnswers(participantId: string) {
    return this.prisma.liveQuizAnswer.findMany({
      where: { participantId },
      include: {
        question: true,
      },
      orderBy: { answeredAt: 'asc' },
    });
  }

  // Delete quiz (facilitator only)
  async delete(id: string) {
    return this.prisma.liveQuiz.delete({
      where: { id },
    });
  }
}
