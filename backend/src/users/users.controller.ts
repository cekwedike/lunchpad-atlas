import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  getMyProfile(@Request() req) {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('me')
  @Patch('me')
  updateMyProfile(@Request() req, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Post('me/change-password')
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  @Get('me/stats')
  getMyStats(@Request() req) {
    return this.usersService.getUserStats(req.user.id);
  }

  @Get('me/achievements')
  getMyAchievements(@Request() req) {
    return this.usersService.getUserAchievements(req.user.id);
  }
}
