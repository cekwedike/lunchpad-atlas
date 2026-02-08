import { IsString, IsNotEmpty, MinLength, IsOptional, IsIn } from 'class-validator';

export type DiscussionTopicType = 'GENERAL' | 'SESSION' | 'RESOURCE';

export class CreateDiscussionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  content: string;

  @IsOptional()
  @IsString()
  cohortId?: string;

  @IsOptional()
  @IsIn(['GENERAL', 'SESSION', 'RESOURCE'])
  topicType?: DiscussionTopicType;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;
}

export class DiscussionFilterDto {
  @IsOptional()
  search?: string;

  @IsOptional()
  cohortId?: string;

  @IsOptional()
  authorId?: string;

  @IsOptional()
  resourceId?: string;

  @IsOptional()
  isPinned?: boolean;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
