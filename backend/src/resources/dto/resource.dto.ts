import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ResourceQueryDto {
  @IsOptional()
  @IsEnum(['VIDEO', 'ARTICLE', 'EXERCISE', 'QUIZ'])
  type?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 10;
}

export class MarkCompleteDto {
  @IsString()
  resourceId: string;
}

export class TrackEngagementDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scrollDepth?: number; // For articles: 0-100%

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  watchPercentage?: number; // For videos: 0-100%

  @IsOptional()
  @IsNumber()
  @Min(0)
  timeSpent?: number; // Total time spent in seconds

  @IsOptional()
  @IsString()
  eventType?: 'scroll' | 'video_progress' | 'time_update' | 'interaction';

  @IsOptional()
  @IsString()
  metadata?: string; // JSON string for additional data
}

export class AdminUnlockResourceDto {
  @IsString()
  userId: string;

  @IsString()
  resourceId: string;
}

