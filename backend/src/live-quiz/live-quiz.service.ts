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
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class LiveQuizService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private achievementsService: AchievementsService,
  ) {}

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
        sessions: { include: { session: { select: { id: true, title: true, cohortId: true } } } },
        questions: { orderBy: { orderIndex: 'asc' } },
      },
    });

    // Notify all fellows in the linked cohort(s) about the new live quiz
    try {
      const cohortIds = [
        ...new Set<string>(
          (quiz.sessions as any[])
            .map((s) => s.session?.cohortId as string | undefined)
            .filter((id): id is string => !!id),
        ),
      ];
      for (const cohortId of cohortIds) {
        const fellows = await this.prisma.user.findMany({
          where: { cohortId, role: 'FELLOW' },
          select: { id: true },
        });
        if (fellows.length > 0) {
          await this.notificationsService.createBulkNotifications(
            fellows.map((f) => ({
              userId: f.id,
              type: 'QUIZ_REMINDER' as any,
              title: 'New Live Quiz Scheduled!',
              message: `"${quiz.title}" has been scheduled. Watch for the go-live notification!`,
              data: { liveQuizId: quiz.id },
            })),
          );
        }
      }
    } catch {
      // Notification failure must not block the create response
    }

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

  // Get live quizzes for the authenticated user's cohort
  async findForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true, role: true },
    });

    if (!user) return [];

    let cohortIds: string[] = [];

    if (user.role === 'ADMIN') {
      // Admins see all live quizzes across all cohorts
      return (this.prisma.liveQuiz as any).findMany({
        where: { status: { not: 'CANCELLED' } },
        include: {
          sessions: { include: { session: { select: { id: true, title: true, sessionNumber: true } } } },
          participants: {
            where: { userId },
            select: { id: true, totalScore: true, rank: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (user.role === 'FACILITATOR') {
      // Facilitators see quizzes from the cohorts they facilitate
      const facilitatedCohorts = await (this.prisma as any).cohortFacilitator.findMany({
        where: { userId },
        select: { cohortId: true },
      });
      cohortIds = facilitatedCohorts.map((fc: any) => fc.cohortId);
    } else if (user.cohortId) {
      // Fellows see quizzes from their own cohort
      cohortIds = [user.cohortId];
    }

    if (cohortIds.length === 0) return [];

    return (this.prisma.liveQuiz as any).findMany({
      where: {
        status: { not: 'CANCELLED' },
        sessions: { some: { session: { cohortId: { in: cohortIds } } } },
      },
      include: {
        sessions: { include: { session: { select: { id: true, title: true, sessionNumber: true } } } },
        participants: {
          where: { userId },
          select: { id: true, totalScore: true, rank: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
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

    const updated = await this.prisma.liveQuiz.update({
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

    // Notify fellows in linked cohort(s) that the quiz has started
    try {
      const quizSessions = await this.prisma.liveQuizSession.findMany({
        where: { liveQuizId: quiz.id },
        select: { session: { select: { cohortId: true } } },
      });
      const cohortIds = [...new Set(quizSessions.map((qs) => qs.session.cohortId))];
      for (const cohortId of cohortIds) {
        await this.notificationsService.notifyQuizStarted(
          cohortId,
          quiz.title,
          quiz.id,
        );
      }
    } catch {
      // Non-critical
    }

    return updated;
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

  // Tiered leaderboard points for live quiz (same scale as MEGA quiz)
  private liveQuizPoints(rank: number): number {
    if (rank === 1) return 3000;
    if (rank === 2) return 2000;
    if (rank === 3) return 1000;
    if (rank <= 7)  return 500;
    return 200;
  }

  // Complete quiz and calculate final rankings + award leaderboard points
  async completeQuiz(id: string) {
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id },
      select: { title: true },
    });

    const participants = await this.prisma.liveQuizParticipant.findMany({
      where: { liveQuizId: id },
      orderBy: { totalScore: 'desc' },
    });

    // Assign ranks and award leaderboard points in parallel
    await Promise.all(
      participants.map((participant, index) => {
        const rank = index + 1;
        const pts = this.liveQuizPoints(rank);
        return Promise.all([
          this.prisma.liveQuizParticipant.update({
            where: { id: participant.id },
            data: { rank },
          }),
          this.prisma.pointsLog.create({
            data: {
              userId: participant.userId,
              liveQuizId: id,
              eventType: 'QUIZ_SUBMIT',
              points: pts,
              description: `Live Quiz: ${quiz?.title ?? 'Unknown'} - Rank #${rank} (score: ${participant.totalScore} pts)`,
            },
          }),
        ]);
      }),
    );

    // Check achievements for all participants (e.g. Quiz Master — top 3 finish)
    await Promise.allSettled(
      participants.map((p) =>
        this.achievementsService.checkAndAwardAchievements(p.userId),
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

    const participant = await this.prisma.liveQuizParticipant.create({
      data: {
        liveQuizId: quizId,
        userId: joinDto.userId,
        displayName: joinDto.displayName,
      },
    });

    // Check achievements (e.g. Live Buzzer — first live quiz participation)
    try {
      await this.achievementsService.checkAndAwardAchievements(joinDto.userId);
    } catch {
      // Non-critical
    }

    return participant;
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

  // Delete quiz (facilitator only) — notifies participants if points are deducted
  async delete(id: string) {
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id },
      select: { title: true },
    });
    if (!quiz) throw new NotFoundException(`Live quiz with ID ${id} not found`);

    // Find participants who earned points from this quiz
    const pointsEntries = await this.prisma.pointsLog.findMany({
      where: { liveQuizId: id },
      select: { userId: true, points: true },
    });

    // Notify each affected participant
    if (pointsEntries.length > 0) {
      await Promise.allSettled(
        pointsEntries.map((entry) =>
          this.notificationsService.createBulkNotifications([{
            userId: entry.userId,
            type: 'SYSTEM_ALERT' as any,
            title: 'Live Quiz Removed',
            message: `"${quiz.title}" has been deleted. Your ${entry.points} leaderboard points from this quiz have been removed.`,
            data: {},
          }]),
        ),
      );
    }

    return this.prisma.liveQuiz.delete({ where: { id } });
  }
}
