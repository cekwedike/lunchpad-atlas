import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResourceState } from '@prisma/client';

export class CreateResourceDto {
  @ApiProperty({ description: 'Session ID this resource belongs to' })
  @IsString()
  sessionId: string;

  @ApiProperty({
    enum: ['VIDEO', 'ARTICLE', 'EXERCISE', 'QUIZ'],
    description: 'Type of resource',
  })
  @IsEnum(['VIDEO', 'ARTICLE', 'EXERCISE', 'QUIZ'])
  type: 'VIDEO' | 'ARTICLE' | 'EXERCISE' | 'QUIZ';

  @ApiProperty({ description: 'Title of the resource' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the resource', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL to the resource (YouTube link, article URL, etc.)',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description:
      'Duration in minutes (for videos) or estimated read time (for articles)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({ description: 'Estimated minutes to complete', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedMinutes?: number;

  @ApiProperty({
    description: 'Whether this is a core resource (required) or optional',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isCore?: boolean;

  @ApiProperty({
    description: 'Points awarded for completing this resource',
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointValue?: number;

  @ApiProperty({ description: 'Display order within session' })
  @IsNumber()
  @Min(1)
  order: number;
}

export class UpdateResourceDto {
  @ApiProperty({ description: 'Session ID this resource belongs to', required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    enum: ['VIDEO', 'ARTICLE', 'EXERCISE', 'QUIZ'],
    description: 'Type of resource',
    required: false,
  })
  @IsOptional()
  @IsEnum(['VIDEO', 'ARTICLE', 'EXERCISE', 'QUIZ'])
  type?: 'VIDEO' | 'ARTICLE' | 'EXERCISE' | 'QUIZ';

  @ApiProperty({ description: 'Title of the resource', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Description of the resource', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'URL to the resource', required: false })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ description: 'Duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({
    description: 'Estimated minutes to complete',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedMinutes?: number;

  @ApiProperty({
    description: 'Whether this is a core resource',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isCore?: boolean;

  @ApiProperty({
    description: 'Points awarded for completing this resource',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointValue?: number;

  @ApiProperty({ description: 'Display order within session', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;

  @ApiProperty({
    description: 'Resource lock/unlock state',
    required: false,
    enum: ['LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COMPLETED'],
  })
  @IsOptional()
  @IsEnum(['LOCKED', 'UNLOCKED', 'IN_PROGRESS', 'COMPLETED'])
  state?: ResourceState;
}

export class ToggleResourceLockDto {
  @ApiProperty({ enum: ['LOCKED', 'UNLOCKED'], description: 'New lock state' })
  @IsEnum(['LOCKED', 'UNLOCKED'])
  state: 'LOCKED' | 'UNLOCKED';
}
