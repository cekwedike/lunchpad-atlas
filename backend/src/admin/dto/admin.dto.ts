import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsArray,
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  facilitatorId?: string;
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  facilitatorId?: string;
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
