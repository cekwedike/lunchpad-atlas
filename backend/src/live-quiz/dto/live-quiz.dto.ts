import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizOptionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsString()
  @IsNotEmpty()
  color: string; // Kahoot-style colors: red, blue, yellow, green
}

export class CreateLiveQuizQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options: QuizOptionDto[]; // Must have exactly 4 options

  @IsInt()
  @Min(0)
  correctAnswer: number; // Index 0-3

  @IsInt()
  @Min(5)
  @IsOptional()
  timeLimit?: number; // Seconds, default 30

  @IsInt()
  @Min(100)
  @IsOptional()
  pointValue?: number; // Default 1000
}

export class CreateLiveQuizDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(5)
  @IsOptional()
  timePerQuestion?: number; // Default 30 seconds

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLiveQuizQuestionDto)
  questions: CreateLiveQuizQuestionDto[];
}

export class JoinLiveQuizDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;
}

export class SubmitAnswerDto {
  @IsString()
  @IsNotEmpty()
  participantId: string;

  @IsString()
  @IsNotEmpty()
  questionId: string;

  @IsInt()
  @Min(0)
  selectedAnswer: number; // Index 0-3

  @IsInt()
  @Min(0)
  timeToAnswer: number; // Milliseconds
}

export class UpdateQuizStatusDto {
  @IsString()
  @IsNotEmpty()
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export class NextQuestionDto {
  @IsInt()
  @Min(0)
  questionIndex: number;
}
