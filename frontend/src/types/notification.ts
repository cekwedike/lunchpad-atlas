export enum NotificationType {
  RESOURCE_UNLOCK = 'RESOURCE_UNLOCK',
  QUIZ_REMINDER = 'QUIZ_REMINDER',
  INCOMPLETE_RESOURCE = 'INCOMPLETE_RESOURCE',
  ACHIEVEMENT_EARNED = 'ACHIEVEMENT_EARNED',
  DISCUSSION_REPLY = 'DISCUSSION_REPLY',
  DISCUSSION_APPROVED = 'DISCUSSION_APPROVED',
  SESSION_REMINDER = 'SESSION_REMINDER',
  LEADERBOARD_UPDATE = 'LEADERBOARD_UPDATE',
  POINT_CAP_WARNING = 'POINT_CAP_WARNING',
  USER_REGISTERED = 'USER_REGISTERED',
  COHORT_CREATED = 'COHORT_CREATED',
  COHORT_UPDATED = 'COHORT_UPDATED',
  RESOURCE_CREATED = 'RESOURCE_CREATED',
  RESOURCE_UPDATED = 'RESOURCE_UPDATED',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_UPDATED = 'SESSION_UPDATED',
  USER_PROMOTED = 'USER_PROMOTED',
  DISCUSSION_FLAGGED = 'DISCUSSION_FLAGGED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
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
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    cohortId?: string;
    cohort?: {
      name: string;
    };
  };
}

export interface NotificationResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}
