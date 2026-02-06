import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  // ==================== FETCH NOTIFICATIONS ====================

  @Get()
  async getNotifications(
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Request() req?: any,
  ) {
    const userId = req.user.userId;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const unreadOnlyBool = unreadOnly === 'true';

    return this.notificationsService.getUserNotifications(
      userId,
      limitNum,
      unreadOnlyBool,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.userId;
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  // ==================== MARK AS READ ====================

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.markAsRead(id, userId);
    return { success: true };
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  // ==================== DELETE ====================

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.deleteNotification(id, userId);
    return { success: true };
  }

  @Delete('read/all')
  async deleteAllRead(@Request() req: any) {
    const userId = req.user.userId;
    await this.notificationsService.deleteAllRead(userId);
    return { success: true };
  }
}
