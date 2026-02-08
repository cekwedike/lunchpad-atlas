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

interface QuizRoom {
  quizId: string;
  participants: Set<string>;
}

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
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

  constructor(private liveQuizService: LiveQuizService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to live quiz: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from live quiz: ${client.id}`);
    // Clean up rooms
    this.quizRooms.forEach((room, quizId) => {
      room.participants.delete(client.id);
      if (room.participants.size === 0) {
        this.quizRooms.delete(quizId);
      }
    });
  }

  // Join a quiz room
  @SubscribeMessage('joinQuiz')
  async handleJoinQuiz(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { quizId: string; userId: string; displayName: string },
  ) {
    const { quizId, userId, displayName } = data;

    try {
      // Join participant to quiz
      const participant = await this.liveQuizService.joinQuiz(quizId, {
        userId,
        displayName,
      });

      // Join socket room
      client.join(quizId);

      // Track room
      if (!this.quizRooms.has(quizId)) {
        this.quizRooms.set(quizId, { quizId, participants: new Set() });
      }
      this.quizRooms.get(quizId)!.participants.add(client.id);

      // Notify others that someone joined
      this.server.to(quizId).emit('participantJoined', {
        participant: {
          id: participant.id,
          displayName: participant.displayName,
          totalScore: participant.totalScore,
        },
        participantCount: this.quizRooms.get(quizId)!.participants.size,
      });

      // Send current quiz state to new participant
      const quiz = await this.liveQuizService.findOne(quizId);
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
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Start quiz (facilitator only)
  @SubscribeMessage('startQuiz')
  async handleStartQuiz(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string },
  ) {
    try {
      const quiz = await this.liveQuizService.startQuiz(data.quizId);

      // Notify all participants
      this.server.to(data.quizId).emit('quizStarted', {
        quizId: quiz.id,
        currentQuestion: quiz.currentQuestion,
        question: quiz.questions[0],
        startedAt: quiz.startedAt,
      });

      return { success: true, quiz };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Show next question (facilitator only)
  @SubscribeMessage('nextQuestion')
  async handleNextQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string; questionIndex: number },
  ) {
    try {
      const quiz = await this.liveQuizService.nextQuestion(
        data.quizId,
        data.questionIndex,
      );

      if (quiz.status === 'COMPLETED') {
        // Quiz finished
        const leaderboard = await this.liveQuizService.getLeaderboard(
          data.quizId,
        );
        this.server.to(data.quizId).emit('quizCompleted', {
          quizId: quiz.id,
          leaderboard,
          completedAt: quiz.completedAt,
        });
      } else {
        // Show next question
        const fullQuiz = await this.liveQuizService.findOne(data.quizId);
        const question = fullQuiz.questions[data.questionIndex];

        this.server.to(data.quizId).emit('questionShown', {
          questionIndex: data.questionIndex,
          question,
          timeLimit: question.timeLimit,
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Submit answer
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
    try {
      const result = await this.liveQuizService.submitAnswer({
        participantId: data.participantId,
        questionId: data.questionId,
        selectedAnswer: data.selectedAnswer,
        timeToAnswer: data.timeToAnswer,
      });

      // Update leaderboard in real-time
      const leaderboard = await this.liveQuizService.getLeaderboard(
        data.quizId,
      );
      this.server.to(data.quizId).emit('leaderboardUpdate', {
        leaderboard: leaderboard.slice(0, 10), // Top 10
      });

      // Notify participant of their result
      client.emit('answerResult', {
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
        streakBonus: result.streakBonus,
        newStreak: result.newStreak,
      });

      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get current leaderboard
  @SubscribeMessage('getLeaderboard')
  async handleGetLeaderboard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quizId: string },
  ) {
    try {
      const leaderboard = await this.liveQuizService.getLeaderboard(
        data.quizId,
      );
      return { success: true, leaderboard };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Show question results (facilitator triggers)
  @SubscribeMessage('showResults')
  handleShowResults(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      quizId: string;
      questionId: string;
      correctAnswer: number;
      statistics: any;
    },
  ) {
    this.server.to(data.quizId).emit('resultsShown', {
      questionId: data.questionId,
      correctAnswer: data.correctAnswer,
      statistics: data.statistics,
    });
    return { success: true };
  }
}
