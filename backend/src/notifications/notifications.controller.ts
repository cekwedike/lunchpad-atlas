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
    const userId = req.user.id;
    const userRole = req.user.role;
    const limitNum = limit ? parseInt(limit, 10) : (userRole === 'ADMIN' ? 50 : 20);
    const unreadOnlyBool = unreadOnly === 'true';

    // Admins see ALL notifications from all users
    if (userRole === 'ADMIN') {
      return this.notificationsService.getAllNotifications(
        limitNum,
        unreadOnlyBool,
      );
    }

    // Fellows and Facilitators see only their own notifications
    return this.notificationsService.getUserNotifications(
      userId,
      limitNum,
      unreadOnlyBool,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admins see count of ALL unread notifications
    if (userRole === 'ADMIN') {
      const count = await this.notificationsService.getAllUnreadCount();
      return { count };
    }
    
    // Fellows and Facilitators see only their own unread count
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  // ==================== MARK AS READ ====================

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admins can mark any notification as read
    if (userRole === 'ADMIN') {
      await this.notificationsService.markAsReadAdmin(id);
    } else {
      // Others can only mark their own notifications
      await this.notificationsService.markAsRead(id, userId);
    }
    return { success: true };
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admins mark all notifications in system as read
    if (userRole === 'ADMIN') {
      await this.notificationsService.markAllAsReadAdmin();
    } else {
      // Others mark only their own notifications
      await this.notificationsService.markAllAsRead(userId);
    }
    return { success: true };
  }

  // ==================== DELETE ====================

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admins can delete any notification
    if (userRole === 'ADMIN') {
      await this.notificationsService.deleteNotificationAdmin(id);
    } else {
      // Others can only delete their own notifications
      await this.notificationsService.deleteNotification(id, userId);
    }
    return { success: true };
  }

  @Delete('read/all')
  async deleteAllRead(@Request() req: any) {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Admins delete all read notifications in system
    if (userRole === 'ADMIN') {
      await this.notificationsService.deleteAllReadAdmin();
    } else {
      // Others delete only their own read notifications
      await this.notificationsService.deleteAllRead(userId);
    }
    return { success: true };
  }
}
