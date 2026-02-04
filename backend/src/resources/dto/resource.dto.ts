import { IsOptional, IsString, IsEnum } from 'class-validator';

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
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}

export class MarkCompleteDto {
  @IsString()
  resourceId: string;
}
