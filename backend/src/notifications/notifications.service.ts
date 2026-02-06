import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // ==================== CREATE NOTIFICATIONS ====================

  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data || {},
      },
    });
  }

  async createBulkNotifications(notifications: CreateNotificationDto[]) {
    return this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data || {},
      })),
    });
  }

  // ==================== HELPER METHODS ====================

  async notifyResourceUnlock(userId: string, resourceTitle: string, resourceId: string) {
    return this.createNotification({
      userId,
      type: 'RESOURCE_UNLOCK',
      title: 'New Resource Available',
      message: `${resourceTitle} is now unlocked and ready to complete!`,
      data: { resourceId },
    });
  }

  async notifyQuizReminder(userId: string, quizTitle: string, quizId: string, dueDate: Date) {
    return this.createNotification({
      userId,
      type: 'QUIZ_REMINDER',
      title: 'Quiz Reminder',
      message: `Don't forget to complete "${quizTitle}" by ${dueDate.toLocaleDateString()}`,
      data: { quizId, dueDate },
    });
  }

  async notifyIncompleteResource(
    userId: string,
    resourceTitle: string,
    resourceId: string,
    daysRemaining: number,
  ) {
    return this.createNotification({
      userId,
      type: 'INCOMPLETE_RESOURCE',
      title: 'Resource Deadline Approaching',
      message: `You have ${daysRemaining} days left to complete "${resourceTitle}"`,
      data: { resourceId, daysRemaining },
    });
  }

  async notifyAchievementEarned(
    userId: string,
    achievementName: string,
    achievementId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'ACHIEVEMENT_EARNED',
      title: '🏆 Achievement Unlocked!',
      message: `Congratulations! You earned "${achievementName}"`,
      data: { achievementId },
    });
  }

  async notifyDiscussionReply(
    userId: string,
    replierName: string,
    discussionTitle: string,
    discussionId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'DISCUSSION_REPLY',
      title: 'New Reply to Your Discussion',
      message: `${replierName} replied to "${discussionTitle}"`,
      data: { discussionId },
    });
  }

  async notifySessionReminder(
    userId: string,
    sessionTitle: string,
    sessionId: string,
    sessionDate: Date,
  ) {
    return this.createNotification({
      userId,
      type: 'SESSION_REMINDER',
      title: 'Upcoming Session',
      message: `"${sessionTitle}" is scheduled for ${sessionDate.toLocaleDateString()}`,
      data: { sessionId, sessionDate },
    });
  }

  async notifyLeaderboardUpdate(userId: string, newRank: number, oldRank: number) {
    return this.createNotification({
      userId,
      type: 'LEADERBOARD_UPDATE',
      title: 'Leaderboard Update',
      message: `You moved from #${oldRank} to #${newRank} on the leaderboard! 🚀`,
      data: { newRank, oldRank },
    });
  }

  async notifyPointCapWarning(userId: string, currentPoints: number, cap: number) {
    return this.createNotification({
      userId,
      type: 'POINT_CAP_WARNING',
      title: 'Monthly Point Cap Warning',
      message: `You've earned ${currentPoints}/${cap} points this month. Focus on quality engagement!`,
      data: { currentPoints, cap },
    });
  }

  // ==================== FETCH NOTIFICATIONS ====================

  async getUserNotifications(userId: string, limit: number = 20, unreadOnly: boolean = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isDeleted: false,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        isDeleted: false,
      },
    });
  }

  // ==================== MARK AS READ ====================

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Security: ensure user owns this notification
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  // ==================== DELETE ====================

  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isDeleted: true,
      },
    });
  }

  async deleteAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: true,
      },
      data: {
        isDeleted: true,
      },
    });
  }

  // ==================== BATCH OPERATIONS ====================

  async sendCohortNotification(cohortId: string, type: NotificationType, title: string, message: string, data?: any) {
    // Get all fellows in cohort
    const fellows = await this.prisma.user.findMany({
      where: { cohortId },
      select: { id: true },
    });

    const notifications = fellows.map((fellow) => ({
      userId: fellow.id,
      type,
      title,
      message,
      data,
    }));

    return this.createBulkNotifications(notifications);
  }
}
