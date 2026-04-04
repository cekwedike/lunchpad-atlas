import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LiveQuizService } from './live-quiz.service';
import { validateWsToken } from '../common/ws-auth.util';
import { PrismaService } from '../prisma.service';

interface QuizRoom {
  quizId: string;
  participants: Set<string>;
}

function sanitizeQuestionForBroadcast(q: Record<string, unknown> | null | undefined) {
  if (!q || typeof q !== 'object') return q;
  const { correctAnswer: _c, ...rest } = q as Record<string, unknown> & {
    correctAnswer?: unknown;
  };
  return rest;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : false),
    credentials: true,
  },
  namespace: '/live-quiz',
})
export class LiveQuizGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private quizRooms: Map<string, QuizRoom> = new Map();

  constructor(
    private liveQuizService: LiveQuizService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    const userId = await validateWsToken(client, this.prisma);
    if (!userId) {
      client.disconnect();
      return;
    }
    (client as any).userId = userId;
    console.log(`Client connected to live quiz: ${client.id} (User: ${userId})`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from live quiz: ${client.id}`);
    this.quizRooms.forEach((room, quizId) => {
      room.participants.delete(client.id);
      if (room.participants.size === 0) {
        this.quizRooms.delete(quizId);
      }
    });
  }

  @SubscribeMessage('joinQuiz')
  async handleJoinQuiz(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { quizId: string; displayName: string },
  ) {
    const userId = (client as any).userId as string;
    const { quizId, displayName } = data;

    try {
      const participant = await this.liveQuizService.joinQuiz(quizId, userId, {
        displayName,
      });

      client.join(quizId);

      if (!this.quizRooms.has(quizId)) {
        this.quizRooms.set(quizId, { quizId, participants: new Set() });
      }
      this.quizRooms.get(quizId)!.participants.add(client.id);

      this.server.to(quizId).emit('participantJoined', {
        participant: {
          id: participant.id,
          displayName: participant.displayName,
          totalScore: participant.totalScore,
        },
        participantCount: this.quizRooms.get(quizId)!.participants.size,
      });

      const quiz = await this.liveQuizService.findOne(quizId, userId);
      return {
        success: true,
        participant,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          status: quiz.status,
          currentQuestion: quiz.currentQuestion,
          totalQuestions: quiz.totalQuestions,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('startQuiz')
  async handleStartQuiz(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string },
  ) {
    const userId = (client as any).userId as string;
    try {
      const quiz = await this.liveQuizService.startQuiz(data.quizId, userId);
      const rawQ = quiz.questions?.[0];
      this.server.to(data.quizId).emit('quizStarted', {
        quizId: quiz.id,
        currentQuestion: quiz.currentQuestion,
        question: sanitizeQuestionForBroadcast(rawQ as Record<string, unknown>),
        startedAt: quiz.startedAt,
      });

      return { success: true, quiz };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('nextQuestion')
  async handleNextQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string },
  ) {
    const userId = (client as any).userId as string;
    try {
      const updated = await this.liveQuizService.nextQuestion(data.quizId, userId);

      if (updated.status === 'COMPLETED') {
        const leaderboard = await this.liveQuizService.getLeaderboard(
          data.quizId,
          userId,
        );
        this.server.to(data.quizId).emit('quizCompleted', {
          quizId: updated.id,
          leaderboard,
          completedAt: updated.completedAt,
        });
      } else {
        const fullQuiz = await this.liveQuizService.findOneFullForFacilitator(
          data.quizId,
          userId,
        );
        const question = fullQuiz.questions[updated.currentQuestion];
        this.server.to(data.quizId).emit('questionShown', {
          questionIndex: updated.currentQuestion,
          question: sanitizeQuestionForBroadcast(question as Record<string, unknown>),
          timeLimit: question?.timeLimit,
        });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('submitAnswer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      quizId: string;
      participantId: string;
      questionId: string;
      selectedAnswer: number;
      timeToAnswer: number;
    },
  ) {
    const userId = (client as any).userId as string;
    try {
      const result = await this.liveQuizService.submitAnswer(
        {
          participantId: data.participantId,
          questionId: data.questionId,
          selectedAnswer: data.selectedAnswer,
          timeToAnswer: data.timeToAnswer,
        },
        userId,
      );

      const leaderboard = await this.liveQuizService.getLeaderboard(
        data.quizId,
        userId,
      );
      this.server.to(data.quizId).emit('leaderboardUpdate', {
        leaderboard: leaderboard.slice(0, 10),
      });

      client.emit('answerResult', {
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
        streakBonus: result.streakBonus,
        newStreak: result.newStreak,
      });

      return { success: true, result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('getLeaderboard')
  async handleGetLeaderboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string },
  ) {
    const userId = (client as any).userId as string;
    try {
      const leaderboard = await this.liveQuizService.getLeaderboard(
        data.quizId,
        userId,
      );
      return { success: true, leaderboard };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('showResults')
  async handleShowResults(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      quizId: string;
      questionId: string;
      statistics?: Record<string, unknown>;
    },
  ) {
    const userId = (client as any).userId as string;
    try {
      const correctAnswer = await this.liveQuizService.revealQuestionCorrectAnswer(
        data.quizId,
        data.questionId,
        userId,
      );
      this.server.to(data.quizId).emit('resultsShown', {
        questionId: data.questionId,
        correctAnswer,
        statistics: data.statistics ?? {},
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
