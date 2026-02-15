import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { UserRole } from '@prisma/client';

/** At least one uppercase, one lowercase, one digit, and one special character */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
const PASSWORD_MESSAGE =
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(72)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsUUID()
  @IsOptional()
  cohortId?: string;
}

export class SetupAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password: string;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
