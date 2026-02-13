import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsArray,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCohortDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}

export class UpdateCohortDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    required: false,
    enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
  })
  @IsOptional()
  @IsEnum(['PENDING', 'ACTIVE', 'COMPLETED', 'ARCHIVED'])
  state?: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

}

export class UpdateSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  monthTheme?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({
    required: false,
    description:
      'If not provided, will auto-calculate as 5 days before scheduledDate',
  })
  @IsOptional()
  @IsDateString()
  unlockDate?: string;
}

export class CreateSessionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  cohortId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sessionNumber: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  monthTheme?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  unlockDate?: string;
}

export class AttendanceRecordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  fellowId: string;

  @ApiProperty()
  @IsBoolean()
  isPresent: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isLate?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isExcused?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkMarkAttendanceDto {
  @ApiProperty({ type: [AttendanceRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  attendances: AttendanceRecordDto[];
}

export class AiReviewDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  transcript: string;
}

export class ChatHistoryItemDto {
  @ApiProperty({ enum: ['user', 'model'] })
  @IsEnum(['user', 'model'])
  role: 'user' | 'model';

  @ApiProperty()
  @IsString()
  content: string;
}

// ── Quiz Management DTOs ──────────────────────────────────────────────────────

export class CreateQuizQuestionDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  question: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  options: string[];

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  correctAnswer: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateQuizDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  cohortId: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sessionIds?: string[];

  @ApiProperty({ enum: ['SESSION', 'GENERAL', 'MEGA'] })
  @IsEnum(['SESSION', 'GENERAL', 'MEGA'])
  quizType: 'SESSION' | 'GENERAL' | 'MEGA';

  @ApiProperty({ description: 'Time limit in minutes, 0 = no limit' })
  @IsInt()
  @Min(0)
  timeLimit: number;

  @ApiProperty({ description: 'Passing score percentage (1-100)' })
  @IsInt()
  @Min(1)
  passingScore: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  pointValue: number;

  @ApiProperty({ required: false, description: 'ISO date string - when quiz opens for fellows' })
  @IsOptional()
  @IsDateString()
  openAt?: string;

  @ApiProperty({ required: false, description: 'ISO date string - when quiz closes' })
  @IsOptional()
  @IsDateString()
  closeAt?: string;

  @ApiProperty({ type: [CreateQuizQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions: CreateQuizQuestionDto[];
}

export class GenerateAIQuestionsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  quizTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sessionIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  cohortId?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  questionCount: number;

  @ApiProperty({ enum: ['easy', 'medium', 'hard'] })
  @IsEnum(['easy', 'medium', 'hard'])
  difficulty: 'easy' | 'medium' | 'hard';
}

export class AiChatDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  transcript?: string;

  @ApiProperty({ type: [ChatHistoryItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];
}
