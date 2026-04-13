import { IsOptional, IsInt, Min, Max, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class LeaderboardFilterDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsString()
  cohortId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

/** Query params for GET /leaderboard/fellows/:userId/breakdown (admin & facilitators). */
export class LeaderboardFellowBreakdownQueryDto {
  /** Required for facilitators; optional for admins (validates cohort when set). */
  @IsOptional()
  @IsString()
  cohortId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Type(() => Number)
  year?: number;
}

export class LeaderboardAdjustPointsDto {
  @IsString()
  userId: string;

  @IsInt()
  @Type(() => Number)
  points: number;

  @IsString()
  description: string;

  /** Admin-only: bypass monthly cap enforcement for this adjustment. */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  bypassMonthlyCap?: boolean;
}
