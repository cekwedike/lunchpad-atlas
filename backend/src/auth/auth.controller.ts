import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, SetupAdminDto, RefreshTokenDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { readRefreshTokenFromCookieHeader } from '../common/cookie-auth.util';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('setup')
  @ApiOperation({ summary: 'Check if initial admin setup is needed' })
  getSetupStatus() {
    return this.authService.getSetupStatus();
  }

  @Post('setup')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Create the first admin account (only works when no admins exist)' })
  @ApiResponse({ status: 201, description: 'Admin account created' })
  @ApiResponse({ status: 403, description: 'Setup already complete' })
  setupFirstAdmin(@Body() dto: SetupAdminDto) {
    return this.authService.setupFirstAdmin(dto);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  register(@Body() dto: RegisterDto, @Request() req) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'New access token issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: ExpressRequest,
  ) {
    const fromBody = dto.refreshToken?.trim();
    const fromCookie = readRefreshTokenFromCookieHeader(req.headers.cookie);
    const token = fromBody || fromCookie;
    if (!token) {
      throw new UnauthorizedException('Refresh token required');
    }
    return this.authService.refreshToken(token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'User information retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Request() req) {
    return req.user;
  }
}
