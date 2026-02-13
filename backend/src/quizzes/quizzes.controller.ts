import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QuizzesService } from './quizzes.service';
import { SubmitQuizDto } from './dto/quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('quizzes')
@Controller('quizzes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get('my-quizzes')
  getMyQuizzes(@Request() req) {
    return this.quizzesService.getMyQuizzes(req.user.id);
  }

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
  submitQuiz(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizzesService.submitQuiz(id, req.user.id, dto);
  }
}
