export enum NotificationType {
  RESOURCE_UNLOCK = 'RESOURCE_UNLOCK',
  QUIZ_REMINDER = 'QUIZ_REMINDER',
  INCOMPLETE_RESOURCE = 'INCOMPLETE_RESOURCE',
  ACHIEVEMENT_EARNED = 'ACHIEVEMENT_EARNED',
  DISCUSSION_REPLY = 'DISCUSSION_REPLY',
  SESSION_REMINDER = 'SESSION_REMINDER',
  LEADERBOARD_UPDATE = 'LEADERBOARD_UPDATE',
  POINT_CAP_WARNING = 'POINT_CAP_WARNING',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  isDeleted: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}
