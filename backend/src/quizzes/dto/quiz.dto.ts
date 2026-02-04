import { IsNotEmpty, IsArray, IsString } from 'class-validator';

export class SubmitQuizDto {
  @IsNotEmpty()
  answers: Record<string, string>; // { questionId: selectedAnswer }
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
