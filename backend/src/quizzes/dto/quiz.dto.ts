import {
  IsNotEmpty,
  IsArray,
  IsString,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class SubmitQuizDto {
  @IsNotEmpty()
  answers: Record<string, string>; // { questionId: selectedAnswer }

  @IsOptional()
  @IsNumber()
  timeTaken?: number; // Time taken in seconds
}

export class QuizResponseDto {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  passed: boolean;
  pointsEarned: number;
  attemptNumber: number;
  completedAt: Date;
}
