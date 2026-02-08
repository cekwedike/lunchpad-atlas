import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';
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
