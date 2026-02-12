import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { NotificationType } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { NotificationsGateway } from './notifications.gateway';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  // ==================== CREATE NOTIFICATIONS ====================

  async createNotification(dto: CreateNotificationDto) {
    const recentDuplicate = await this.prisma.notification.findFirst({
      where: {
        userId: dto.userId,
        type: dto.type,
        message: dto.message,
        createdAt: {
          gte: new Date(Date.now() - 5000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentDuplicate) {
      return recentDuplicate;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data || {},
      },
    });

    this.notificationsGateway.sendNotificationToUser(dto.userId, notification);
    const unreadCount = await this.getUnreadCount(dto.userId);
    this.notificationsGateway.sendUnreadCountUpdate(dto.userId, unreadCount);

    this.sendNotificationEmail(dto).catch((error) => {
      console.error('Failed to send notification email:', error);
    });

    return notification;
  }

  async createBulkNotifications(notifications: CreateNotificationDto[]) {
    const result = await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data || {},
      })),
    });

    const grouped = notifications.reduce<
      Record<string, CreateNotificationDto[]>
    >((acc, item) => {
      if (!acc[item.userId]) acc[item.userId] = [];
      acc[item.userId].push(item);
      return acc;
    }, {});

    await Promise.all(
      Object.entries(grouped).map(async ([userId, userNotifications]) => {
        const lastNotification =
          userNotifications[userNotifications.length - 1];
        this.notificationsGateway.sendNotificationToUser(userId, {
          ...lastNotification,
          createdAt: new Date(),
        });
        const unreadCount = await this.getUnreadCount(userId);
        this.notificationsGateway.sendUnreadCountUpdate(userId, unreadCount);
      }),
    );

    this.sendBulkNotificationEmails(notifications).catch((error) => {
      console.error('Failed to send bulk notification emails:', error);
    });

    return result;
  }

  private isEmailEnabled(): boolean {
    return this.configService.get('EMAIL_NOTIFICATIONS_ENABLED') === 'true';
  }

  private buildActionUrl(data?: any): string | undefined {
    const baseUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:5173',
    );

    if (!data) return undefined;

    if (data.channelId)
      return `${baseUrl}/dashboard/chat?channelId=${data.channelId}`;
    if (data.discussionId)
      return `${baseUrl}/dashboard/discussions/${data.discussionId}`;
    if (data.resourceId)
      return `${baseUrl}/dashboard/resources/${data.resourceId}`;
    if (data.sessionId)
      return `${baseUrl}/dashboard/sessions/${data.sessionId}`;
    if (data.quizId) return `${baseUrl}/dashboard/quizzes/${data.quizId}`;

    return undefined;
  }

  private async sendNotificationEmail(dto: CreateNotificationDto) {
    if (!this.isEmailEnabled()) return;

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { email: true, firstName: true },
    });

    if (!user?.email) return;

    const actionUrl = this.buildActionUrl(dto.data);

    await this.emailService.sendNotificationEmail(user.email, {
      firstName: user.firstName || 'there',
      title: dto.title,
      message: dto.message,
      actionUrl,
      actionText: actionUrl ? 'View details' : undefined,
    });
  }

  private async sendBulkNotificationEmails(
    notifications: CreateNotificationDto[],
  ) {
    if (!this.isEmailEnabled()) return;

    const userIds = Array.from(
      new Set(notifications.map((notification) => notification.userId)),
    );
    if (userIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, firstName: true },
    });

    const userMap = new Map(users.map((user) => [user.id, user]));

    await Promise.all(
      notifications.map((notification) => {
        const user = userMap.get(notification.userId);
        if (!user?.email) return Promise.resolve();

        const actionUrl = this.buildActionUrl(notification.data);

        return this.emailService.sendNotificationEmail(user.email, {
          firstName: user.firstName || 'there',
          title: notification.title,
          message: notification.message,
          actionUrl,
          actionText: actionUrl ? 'View details' : undefined,
        });
      }),
    );
  }

  // ==================== HELPER METHODS ====================

  async notifyResourceUnlock(
    userId: string,
    resourceTitle: string,
    resourceId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'RESOURCE_UNLOCK',
      title: 'New Resource Available',
      message: `${resourceTitle} is now unlocked and ready to complete!`,
      data: { resourceId },
    });
  }

  async notifyFellowsResourceUnlocked(
    resourceId: string,
    cohortId: string,
    resourceTitle: string,
  ) {
    const fellows = await this.prisma.user.findMany({
      where: { cohortId, role: 'FELLOW' },
      select: { id: true },
    });

    const notifications = fellows.map((fellow) => ({
      userId: fellow.id,
      type: 'RESOURCE_UNLOCK' as NotificationType,
      title: 'New Resource Available',
      message: `"${resourceTitle}" is now unlocked and ready to complete!`,
      data: { resourceId },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyQuizReminder(
    userId: string,
    quizTitle: string,
    quizId: string,
    dueDate: Date,
  ) {
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

  async notifyAttendanceMarked(
    userId: string,
    sessionTitle: string,
    sessionId: string,
    isPresent: boolean,
    isLate = false,
  ) {
    const status = !isPresent ? 'absent' : isLate ? 'present (late)' : 'present';
    return this.createNotification({
      userId,
      type: 'ATTENDANCE_MARKED',
      title: 'Attendance Recorded',
      message: `Your attendance for "${sessionTitle}" has been marked as ${status}.`,
      data: { sessionId, isPresent, isLate },
    });
  }

  async notifyLeaderboardUpdate(
    userId: string,
    newRank: number,
    oldRank: number,
  ) {
    return this.createNotification({
      userId,
      type: 'LEADERBOARD_UPDATE',
      title: 'Leaderboard Update',
      message: `You moved from #${oldRank} to #${newRank} on the leaderboard! 🚀`,
      data: { newRank, oldRank },
    });
  }

  async notifyPointCapWarning(
    userId: string,
    currentPoints: number,
    cap: number,
  ) {
    return this.createNotification({
      userId,
      type: 'POINT_CAP_WARNING',
      title: 'Monthly Point Cap Warning',
      message: `You've earned ${currentPoints}/${cap} points this month. Focus on quality engagement!`,
      data: { currentPoints, cap },
    });
  }

  async notifyNewDiscussion(
    userId: string,
    authorName: string,
    discussionTitle: string,
    discussionId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'DISCUSSION_REPLY',
      title: 'New Discussion',
      message: `${authorName} started a new discussion: "${discussionTitle}"`,
      data: { discussionId, authorName },
    });
  }

  async notifyBulkNewDiscussion(
    userIds: string[],
    authorName: string,
    discussionTitle: string,
    discussionId: string,
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'DISCUSSION_REPLY' as NotificationType,
      title: 'New Discussion',
      message: `${authorName} started a new discussion: "${discussionTitle}"`,
      data: { discussionId, authorName },
    }));
    return this.createBulkNotifications(notifications);
  }

  async notifyChatMessage(
    userId: string,
    senderName: string,
    channelName: string,
    messagePreview: string,
    channelId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'SYSTEM_ALERT',
      title: `New message in ${channelName}`,
      message: `${senderName}: ${messagePreview}`,
      data: { senderName, channelName, channelId },
    });
  }

  async notifyBulkChatMessage(
    userIds: string[],
    senderName: string,
    channelName: string,
    messagePreview: string,
    channelId: string,
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'SYSTEM_ALERT' as NotificationType,
      title: `New message in ${channelName}`,
      message: `${senderName}: ${messagePreview}`,
      data: { senderName, channelName, channelId },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyDiscussionPinned(
    userId: string,
    discussionTitle: string,
    discussionId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'SYSTEM_ALERT',
      title: 'Discussion Pinned',
      message: `"${discussionTitle}" has been pinned by an admin`,
      data: { discussionId },
    });
  }

  async notifyDiscussionLocked(
    userId: string,
    discussionTitle: string,
    discussionId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'SYSTEM_ALERT',
      title: 'Discussion Locked',
      message: `"${discussionTitle}" has been locked. No new comments can be added.`,
      data: { discussionId },
    });
  }

  async notifyDiscussionApproved(
    userId: string,
    discussionTitle: string,
    discussionId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'DISCUSSION_APPROVED',
      title: 'Discussion Approved',
      message: `Your discussion "${discussionTitle}" has been approved.`,
      data: { discussionId },
    });
  }

  // ==================== FETCH NOTIFICATIONS ====================

  async getUserNotifications(
    userId: string,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isDeleted: false,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Admin sees ALL notifications from all users
  async getAllNotifications(limit: number = 50, unreadOnly: boolean = false) {
    return this.prisma.notification.findMany({
      where: {
        isDeleted: false,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            cohortId: true,
            cohort: {
              select: {
                name: true,
              },
            },
          },
        },
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

  // Admin gets count of ALL unread notifications
  async getAllUnreadCount() {
    return this.prisma.notification.count({
      where: {
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

  // Admin can mark any notification as read
  async markAsReadAdmin(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
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

  // Admin marks ALL notifications in system as read
  async markAllAsReadAdmin() {
    return this.prisma.notification.updateMany({
      where: { isRead: false },
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

  // Admin can delete any notification
  async deleteNotificationAdmin(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isDeleted: true },
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

  // Admin deletes ALL read notifications in system
  async deleteAllReadAdmin() {
    return this.prisma.notification.updateMany({
      where: { isRead: true },
      data: { isDeleted: true },
    });
  }

  // ==================== BATCH OPERATIONS ====================

  async sendCohortNotification(
    cohortId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any,
  ) {
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

  // ==================== ADMIN NOTIFICATION HELPERS ====================

  async notifyAdminsUserUpdated(
    updatedUserId: string,
    adminName: string,
    changes: string,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: updatedUserId },
      select: { firstName: true, lastName: true, email: true },
    });

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: 'USER_PROMOTED' as NotificationType,
      title: '👤 User Role Updated',
      message: `${adminName} updated ${updatedUser?.firstName} ${updatedUser?.lastName} - ${changes}`,
      data: { updatedUserId, changes, adminName },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyAdminsUserCreated(newUserId: string, adminName: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const newUser = await this.prisma.user.findUnique({
      where: { id: newUserId },
      select: { firstName: true, lastName: true, email: true, role: true },
    });

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: 'USER_REGISTERED' as NotificationType,
      title: '✨ New User Created',
      message: `${adminName} created new ${newUser?.role}: ${newUser?.firstName} ${newUser?.lastName} (${newUser?.email})`,
      data: { newUserId, adminName },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyAdminsCohortUpdated(
    cohortId: string,
    adminName: string,
    changes: string,
    type: NotificationType = 'COHORT_UPDATED',
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { name: true },
    });

    const title =
      type === 'COHORT_CREATED' ? '📚 Cohort Created' : '📚 Cohort Updated';

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: type,
      title,
      message: `${adminName} ${changes} cohort "${cohort?.name}"`,
      data: { cohortId, changes, adminName },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyAdminsResourceUpdated(
    resourceId: string,
    adminName: string,
    action: string,
    type: NotificationType = 'RESOURCE_UPDATED',
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      select: { title: true },
    });

    const title =
      type === 'RESOURCE_CREATED'
        ? '📖 Resource Created'
        : '📖 Resource Updated';

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: type,
      title,
      message: `${adminName} ${action} resource: "${resource?.title}"`,
      data: { resourceId, action, adminName },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyAdminsSessionUpdated(
    sessionId: string,
    adminName: string,
    action: string,
    type: NotificationType = 'SESSION_UPDATED',
  ) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { title: true },
    });

    const title =
      type === 'SESSION_CREATED' ? '📅 Session Created' : '📅 Session Updated';

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: type,
      title,
      message: `${adminName} ${action} session: "${session?.title}"`,
      data: { sessionId, action, adminName },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyChatRoomCreated(
    userIds: string[],
    channelName: string,
    cohortName: string,
    channelId: string,
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'SYSTEM_ALERT' as NotificationType,
      title: 'New Chat Room',
      message: `${channelName} is now available for ${cohortName}.`,
      data: { channelId },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyChatRoomLockUpdated(
    userIds: string[],
    channelName: string,
    cohortName: string,
    channelId: string,
    isLocked: boolean,
  ) {
    const statusLabel = isLocked ? 'locked' : 'unlocked';
    const notifications = userIds.map((userId) => ({
      userId,
      type: 'SYSTEM_ALERT' as NotificationType,
      title: `Chat Room ${isLocked ? 'Locked' : 'Unlocked'}`,
      message: `${channelName} for ${cohortName} has been ${statusLabel}.`,
      data: { channelId },
    }));

    return this.createBulkNotifications(notifications);
  }

  async notifyUserPromoted(userId: string, newRole: string, adminName: string) {
    return this.createNotification({
      userId,
      type: 'USER_PROMOTED',
      title: 'Role Updated',
      message: `${adminName} updated your role to ${newRole}.`,
      data: { newRole },
    });
  }

  async notifyAdminsUserRegistered(newUserId: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const newUser = await this.prisma.user.findUnique({
      where: { id: newUserId },
      select: { firstName: true, lastName: true, email: true, role: true },
    });

    const notifications = admins.map((admin) => ({
      userId: admin.id,
      type: 'USER_REGISTERED' as NotificationType,
      title: 'New User Registered',
      message: `${newUser?.firstName} ${newUser?.lastName} (${newUser?.email}) registered as ${newUser?.role}.`,
      data: { newUserId },
    }));

    return this.createBulkNotifications(notifications);
  }
}
