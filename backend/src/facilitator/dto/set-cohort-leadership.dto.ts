import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class SetCohortLeadershipDto {
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  captainUserId?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  assistantUserId?: string | null;
}
