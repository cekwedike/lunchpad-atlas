import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class CreateDiscussionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  content: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
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
  isPinned?: boolean;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
