import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { SubmitQuizDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get(':id')
  getQuiz(@Param('id') id: string) {
    return this.quizzesService.getQuiz(id);
  }

  @Get(':id/questions')
  getQuizQuestions(@Param('id') id: string) {
    return this.quizzesService.getQuizQuestions(id);
  }

  @Get(':id/attempts')
  getQuizAttempts(@Param('id') id: string, @Request() req) {
    return this.quizzesService.getQuizAttempts(id, req.user.id);
  }

  @Post(':id/submit')
  submitQuiz(@Param('id') id: string, @Request() req, @Body() dto: SubmitQuizDto) {
    return this.quizzesService.submitQuiz(id, req.user.id, dto);
  }
}
