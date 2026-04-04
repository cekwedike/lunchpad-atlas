import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
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

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  create(@Body() createDto: CreateLiveQuizDto) {
    return this.liveQuizService.create(createDto);
  }

  @Get('my')
  findMy(@Request() req) {
    return this.liveQuizService.findForUser(req.user.id);
  }

  @Get('cohort/:cohortId')
  findByCohort(@Param('cohortId') cohortId: string, @Request() req) {
    return this.liveQuizService.findByCohort(cohortId, req.user.id);
  }

  @Get('session/:sessionId')
  findBySession(@Param('sessionId') sessionId: string, @Request() req) {
    return this.liveQuizService.findBySession(sessionId, req.user.id);
  }

  @Get('participant/:participantId/answers')
  getParticipantAnswers(
    @Param('participantId') participantId: string,
    @Request() req,
  ) {
    return this.liveQuizService.getParticipantAnswers(participantId, req.user.id);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string, @Request() req) {
    return this.liveQuizService.getLeaderboard(id, req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.liveQuizService.findOne(id, req.user.id);
  }

  @Post(':id/start')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  startQuiz(@Param('id') id: string, @Request() req) {
    return this.liveQuizService.startQuiz(id, req.user.id);
  }

  @Post(':id/next-question')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  nextQuestion(@Param('id') id: string, @Request() req) {
    return this.liveQuizService.nextQuestion(id, req.user.id);
  }

  @Post(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  completeQuiz(@Param('id') id: string, @Request() req) {
    return this.liveQuizService.completeQuiz(id, req.user.id);
  }

  @Post(':id/join')
  joinQuiz(
    @Param('id') id: string,
    @Request() req,
    @Body() joinDto: JoinLiveQuizDto,
  ) {
    return this.liveQuizService.joinQuiz(id, req.user.id, joinDto);
  }

  @Post('answer')
  submitAnswer(@Body() submitDto: SubmitAnswerDto, @Request() req) {
    return this.liveQuizService.submitAnswer(submitDto, req.user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.FACILITATOR, UserRole.ADMIN)
  delete(@Param('id') id: string, @Request() req) {
    return this.liveQuizService.delete(id, req.user.id);
  }
}
