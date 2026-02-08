import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
  ForbiddenException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  // ==================== CHANNELS ====================

  @Post('channels')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  createChannel(@Body() createChannelDto: CreateChannelDto, @Request() req: any) {
    return this.chatService.createChannel(createChannelDto, req.user.id);
  }

  @Get('channels/cohort/:cohortId')
  getCohortChannels(@Param('cohortId') cohortId: string, @Request() req: any) {
    return this.chatService.getCohortChannels(cohortId, req.user.id);
  }

  @Get('channels')
  @Roles(UserRole.ADMIN)
  getAllChannels() {
    return this.chatService.getAllChannels();
  }

  @Get('channels/:channelId')
  async getChannelById(@Param('channelId') channelId: string, @Request() req: any) {
    const channel = await this.chatService.getChannelById(channelId);

    if (req.user.role !== UserRole.ADMIN && req.user.cohortId !== channel.cohortId) {
      throw new ForbiddenException('You do not have access to this channel');
    }

    return channel;
  }

  @Patch('channels/:channelId/archive')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  archiveChannel(@Param('channelId') channelId: string, @Request() req: any) {
    return this.chatService.archiveChannel(channelId, req.user.id);
  }

  @Patch('channels/:channelId/lock')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  toggleChannelLock(@Param('channelId') channelId: string, @Request() req: any) {
    return this.chatService.toggleChannelLock(channelId, req.user.id);
  }

  @Delete('channels/:channelId')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  deleteChannel(@Param('channelId') channelId: string, @Request() req: any) {
    return this.chatService.deleteChannel(channelId, req.user.id);
  }

  // ==================== MESSAGES ====================

  @Post('messages')
  createMessage(@Body() createMessageDto: CreateMessageDto, @Request() req: any) {
    return this.chatService.createMessage(createMessageDto, req.user.id);
  }

  @Get('messages/:channelId')
  getChannelMessages(
    @Param('channelId') channelId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Request() req?: any,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.chatService.getChannelMessages(
      channelId,
      req.user.id,
      limitNum,
      before,
    );
  }

  @Delete('messages/:messageId')
  deleteMessage(@Param('messageId') messageId: string, @Request() req: any) {
    return this.chatService.deleteMessage(messageId, req.user.id);
  }

  @Patch('messages/:messageId/flag')
  @Roles(UserRole.ADMIN, UserRole.FACILITATOR)
  flagMessage(@Param('messageId') messageId: string, @Request() req: any) {
    return this.chatService.flagMessage(messageId, req.user.id);
  }

  // ==================== ADMIN UTILITIES ====================

  @Post('channels/initialize/:cohortId')
  @Roles(UserRole.ADMIN)
  initializeCohortChannels(@Param('cohortId') cohortId: string) {
    return this.chatService.initializeCohortChannels(cohortId);
  }
}
