import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class AuthResponseDto {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
