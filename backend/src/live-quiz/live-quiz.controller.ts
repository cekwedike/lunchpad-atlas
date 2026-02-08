import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LiveQuizService } from './live-quiz.service';
import {
  CreateLiveQuizDto,
  JoinLiveQuizDto,
  SubmitAnswerDto,
} from './dto/live-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('live-quiz')
@UseGuards(JwtAuthGuard)
export class LiveQuizController {
  constructor(private readonly liveQuizService: LiveQuizService) {}

  // Create new live quiz (Facilitator/Admin only)
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  create(@Body() createDto: CreateLiveQuizDto) {
    return this.liveQuizService.create(createDto);
  }

  // Get quiz by ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.liveQuizService.findOne(id);
  }

  // Get all quizzes for a session
  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string) {
    return this.liveQuizService.findBySession(sessionId);
  }

  // Start a quiz (Facilitator/Admin only)
  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  startQuiz(@Param('id') id: string) {
    return this.liveQuizService.startQuiz(id);
  }

  // Complete a quiz (Facilitator/Admin only)
  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  completeQuiz(@Param('id') id: string) {
    return this.liveQuizService.completeQuiz(id);
  }

  // Join a quiz
  @Post(':id/join')
  joinQuiz(@Param('id') id: string, @Body() joinDto: JoinLiveQuizDto) {
    return this.liveQuizService.joinQuiz(id, joinDto);
  }

  // Submit an answer
  @Post('answer')
  submitAnswer(@Body() submitDto: SubmitAnswerDto) {
    return this.liveQuizService.submitAnswer(submitDto);
  }

  // Get leaderboard
  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string) {
    return this.liveQuizService.getLeaderboard(id);
  }

  // Get participant's answers
  @Get('participant/:participantId/answers')
  getParticipantAnswers(@Param('participantId') participantId: string) {
    return this.liveQuizService.getParticipantAnswers(participantId);
  }

  // Delete quiz (Facilitator/Admin only)
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.liveQuizService.delete(id);
  }
}
