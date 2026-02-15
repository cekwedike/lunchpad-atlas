import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
const PASSWORD_MESSAGE =
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(72)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

export class UserStatsDto {
  resourcesCompleted: number;
  discussionsPosted: number;
  quizzesTaken: number;
  totalPoints: number;
  currentStreak: number;
}
