import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  CreateLiveQuizDto,
  JoinLiveQuizDto,
  SubmitAnswerDto,
} from './dto/live-quiz.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { NotificationType, Prisma, UserRole } from '@prisma/client';

@Injectable()
export class LiveQuizService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private achievementsService: AchievementsService,
  ) {}

  private async getLiveQuizCohortIds(liveQuizId: string): Promise<string[]> {
    const rows = await this.prisma.liveQuizSession.findMany({
      where: { liveQuizId },
      select: { session: { select: { cohortId: true } } },
    });
    return [...new Set(rows.map((r) => r.session.cohortId))];
  }

  private async getLiveQuizSessionIds(liveQuizId: string): Promise<string[]> {
    const rows = await this.prisma.liveQuizSession.findMany({
      where: { liveQuizId },
      select: { sessionId: true },
    });
    return rows.map((r) => r.sessionId);
  }

  private async canFacilitateLiveQuiz(userId: string, quizId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    if (user.role !== UserRole.FACILITATOR) return false;
    const cohortIds = await this.getLiveQuizCohortIds(quizId);
    if (cohortIds.length === 0) return false;
    const link = await this.prisma.cohortFacilitator.findFirst({
      where: { userId, cohortId: { in: cohortIds } },
    });
    return !!link;
  }

  async assertCanFacilitateLiveQuiz(userId: string, quizId: string): Promise<void> {
    if (!(await this.canFacilitateLiveQuiz(userId, quizId))) {
      throw new ForbiddenException('You cannot facilitate this live quiz');
    }
  }

  private async assertCanParticipateLiveQuiz(userId: string, quizId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, cohortId: true },
    });
    if (!user) throw new ForbiddenException('User not found');
    if (user.role === UserRole.ADMIN) return;

    const cohortIds = await this.getLiveQuizCohortIds(quizId);
    const sessionIds = await this.getLiveQuizSessionIds(quizId);

    if (user.role === UserRole.FELLOW) {
      if (user.cohortId && cohortIds.includes(user.cohortId)) return;
      throw new ForbiddenException('You are not assigned to this live quiz cohort');
    }

    if (user.role === UserRole.FACILITATOR) {
      const link = await this.prisma.cohortFacilitator.findFirst({
        where: { userId, cohortId: { in: cohortIds } },
      });
      if (link) return;
      throw new ForbiddenException('You are not a facilitator for this live quiz cohort');
    }

    if (user.role === UserRole.GUEST_FACILITATOR) {
      if (sessionIds.length === 0) throw new ForbiddenException('Invalid live quiz');
      const guest = await this.prisma.guestSession.findFirst({
        where: { userId, sessionId: { in: sessionIds } },
      });
      if (guest) return;
      throw new ForbiddenException('You are not assigned to a session for this live quiz');
    }

    throw new ForbiddenException('You cannot join this live quiz');
  }

  private async assertCanViewLiveQuiz(viewerId: string, quizId: string): Promise<void> {
    if (await this.canFacilitateLiveQuiz(viewerId, quizId)) return;
    await this.assertCanParticipateLiveQuiz(viewerId, quizId);
  }

  private async assertCanAccessCohort(viewerId: string, cohortId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true, cohortId: true },
    });
    if (!user) throw new ForbiddenException('User not found');
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.FELLOW && user.cohortId === cohortId) return;
    if (user.role === UserRole.FACILITATOR) {
      const link = await this.prisma.cohortFacilitator.findFirst({
        where: { userId: viewerId, cohortId },
      });
      if (link) return;
    }
    if (user.role === UserRole.GUEST_FACILITATOR) {
      const guest = await this.prisma.guestSession.findFirst({
        where: { userId: viewerId, session: { cohortId } },
      });
      if (guest) return;
    }
    throw new ForbiddenException('You cannot access this cohort');
  }

  private stripCorrectAnswerFromQuestion(q: {
    id: string;
    questionText: string;
    options: unknown;
    correctAnswer: number;
    orderIndex: number;
    timeLimit: number;
    pointValue: number;
    liveQuizId?: string;
    createdAt?: Date;
  }) {
    const { correctAnswer: _c, ...rest } = q;
    return rest;
  }

  private async withStrippedQuestionsIfNeeded<T extends { questions?: any[] }>(
    quiz: T,
    viewerId: string,
    quizId: string,
  ): Promise<T> {
    if (await this.canFacilitateLiveQuiz(viewerId, quizId)) {
      return quiz;
    }
    if (!quiz.questions?.length) return quiz;
    return {
      ...quiz,
      questions: quiz.questions.map((q) => this.stripCorrectAnswerFromQuestion(q)),
    };
  }

  // Create a new live quiz
  async create(createDto: CreateLiveQuizDto) {
    const quiz = await this.prisma.liveQuiz.create({
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
            options: q.options as unknown as Prisma.InputJsonValue,
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
          quiz.sessions
            .map((s) => s.session?.cohortId)
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
              type: NotificationType.QUIZ_REMINDER,
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

  async revealQuestionCorrectAnswer(
    quizId: string,
    questionId: string,
    facilitatorUserId: string,
  ): Promise<number> {
    await this.assertCanFacilitateLiveQuiz(facilitatorUserId, quizId);
    const question = await this.prisma.liveQuizQuestion.findFirst({
      where: { id: questionId, liveQuizId: quizId },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }
    return question.correctAnswer;
  }

  /** Full quiz including correct answers — only call after authorization checks. */
  async findOneFullForFacilitator(id: string, viewerId: string) {
    await this.assertCanFacilitateLiveQuiz(viewerId, id);
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { orderIndex: 'asc' } },
        participants: {
          orderBy: { totalScore: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!quiz) {
      throw new NotFoundException(`Live quiz with ID ${id} not found`);
    }
    return quiz;
  }

  // Get quiz by ID (participant view strips correct answers)
  async findOne(id: string, viewerId: string) {
    await this.assertCanViewLiveQuiz(viewerId, id);
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

    return this.withStrippedQuestionsIfNeeded(quiz, viewerId, id);
  }

  // Get live quizzes for the authenticated user's cohort
  async findForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cohortId: true, role: true },
    });

    if (!user) return [];

    let cohortIds: string[] = [];
    let sessionIdsFilter: string[] | undefined;

    if (user.role === 'ADMIN') {
      return this.prisma.liveQuiz.findMany({
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
      const facilitatedCohorts = await this.prisma.cohortFacilitator.findMany({
        where: { userId },
        select: { cohortId: true },
      });
      cohortIds = facilitatedCohorts.map((fc) => fc.cohortId);
    } else if (user.role === 'GUEST_FACILITATOR') {
      const guestRows = await this.prisma.guestSession.findMany({
        where: { userId },
        select: { sessionId: true },
      });
      sessionIdsFilter = guestRows.map((g) => g.sessionId);
      if (sessionIdsFilter.length === 0) return [];
    } else if (user.cohortId) {
      cohortIds = [user.cohortId];
    }

    if (user.role !== 'GUEST_FACILITATOR' && cohortIds.length === 0) return [];

    const where: Prisma.LiveQuizWhereInput = { status: { not: 'CANCELLED' } };
    if (sessionIdsFilter) {
      where.sessions = { some: { sessionId: { in: sessionIdsFilter } } };
    } else {
      where.sessions = { some: { session: { cohortId: { in: cohortIds } } } };
    }

    return this.prisma.liveQuiz.findMany({
      where,
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
  async findByCohort(cohortId: string, viewerId: string) {
    await this.assertCanAccessCohort(viewerId, cohortId);
    const list = await this.prisma.liveQuiz.findMany({
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
    const out: Awaited<ReturnType<typeof this.withStrippedQuestionsIfNeeded>>[] = [];
    for (const q of list) {
      out.push(await this.withStrippedQuestionsIfNeeded(q, viewerId, q.id));
    }
    return out;
  }

  // Get all quizzes for a session
  async findBySession(sessionId: string, viewerId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { cohortId: true },
    });
    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }
    await this.assertCanAccessCohort(viewerId, session.cohortId);
    const list = await this.prisma.liveQuiz.findMany({
      where: { sessions: { some: { sessionId } } },
      include: {
        sessions: { include: { session: { select: { id: true, title: true } } } },
        questions: { orderBy: { orderIndex: 'asc' } },
        participants: { take: 10, orderBy: { totalScore: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const out: Awaited<ReturnType<typeof this.withStrippedQuestionsIfNeeded>>[] = [];
    for (const q of list) {
      out.push(await this.withStrippedQuestionsIfNeeded(q, viewerId, q.id));
    }
    return out;
  }

  // Start a quiz
  async startQuiz(id: string, actorUserId: string) {
    await this.assertCanFacilitateLiveQuiz(actorUserId, id);

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

  // Move to next question (server advances from currentQuestion; ignores client-supplied index)
  async nextQuestion(id: string, actorUserId: string) {
    await this.assertCanFacilitateLiveQuiz(actorUserId, id);

    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id },
      include: { questions: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!quiz) {
      throw new NotFoundException(`Live quiz with ID ${id} not found`);
    }

    const current = quiz.currentQuestion ?? 0;
    const nextIdx = current + 1;

    if (nextIdx >= quiz.questions.length) {
      return this.completeQuiz(id, actorUserId);
    }

    return this.prisma.liveQuiz.update({
      where: { id },
      data: { currentQuestion: nextIdx },
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
  async completeQuiz(id: string, actorUserId: string) {
    await this.assertCanFacilitateLiveQuiz(actorUserId, id);

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

  // Join a quiz (userId always from authenticated identity)
  async joinQuiz(quizId: string, userId: string, joinDto: JoinLiveQuizDto) {
    await this.assertCanParticipateLiveQuiz(userId, quizId);

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

    const existing = await this.prisma.liveQuizParticipant.findUnique({
      where: {
        liveQuizId_userId: {
          liveQuizId: quizId,
          userId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const participant = await this.prisma.liveQuizParticipant.create({
      data: {
        liveQuizId: quizId,
        userId,
        displayName: joinDto.displayName,
      },
    });

    try {
      await this.achievementsService.checkAndAwardAchievements(userId);
    } catch {
      // Non-critical
    }

    return participant;
  }

  // Submit an answer
  async submitAnswer(submitDto: SubmitAnswerDto, authUserId: string) {
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

    if (participant.userId !== authUserId) {
      throw new ForbiddenException('Cannot submit answers for another participant');
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
  async getLeaderboard(quizId: string, viewerId: string) {
    await this.assertCanViewLiveQuiz(viewerId, quizId);

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
  async getParticipantAnswers(participantId: string, viewerId: string) {
    const participant = await this.prisma.liveQuizParticipant.findUnique({
      where: { id: participantId },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    if (participant.userId !== viewerId) {
      await this.assertCanFacilitateLiveQuiz(viewerId, participant.liveQuizId);
    }

    return this.prisma.liveQuizAnswer.findMany({
      where: { participantId },
      include: {
        question: true,
      },
      orderBy: { answeredAt: 'asc' },
    });
  }

  // Delete quiz (facilitator only) — notifies participants if points are deducted
  async delete(id: string, actorUserId: string) {
    await this.assertCanFacilitateLiveQuiz(actorUserId, id);

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
            type: NotificationType.SYSTEM_ALERT,
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
