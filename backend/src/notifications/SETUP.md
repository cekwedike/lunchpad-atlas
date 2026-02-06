# Notifications Backend Setup

## Overview

Complete notification system with real-time WebSocket support, bulk operations, and helper methods for all notification types.

## Setup Steps

### 1. Database Migration

The notification schema has been added to Prisma. Run migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name add-notifications-system
```

### 2. WebSocket Dependencies

If not already installed from chat module:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

## Features

### Notification Types

- `RESOURCE_UNLOCK` - New resource available
- `QUIZ_REMINDER` - Upcoming quiz reminder
- `INCOMPLETE_RESOURCE` - Resource nearing deadline
- `ACHIEVEMENT_EARNED` - New achievement unlocked
- `DISCUSSION_REPLY` - Reply to discussion/comment
- `SESSION_REMINDER` - Upcoming session reminder
- `LEADERBOARD_UPDATE` - Moved up in rankings
- `POINT_CAP_WARNING` - Approaching monthly point cap

### REST API Endpoints

- `GET /notifications` - Get user notifications (supports ?limit=20&unreadOnly=true)
- `GET /notifications/unread-count` - Get unread notification count
- `PATCH /notifications/:id/read` - Mark notification as read
- `PATCH /notifications/mark-all-read` - Mark all as read
- `DELETE /notifications/:id` - Delete notification
- `DELETE /notifications/read/all` - Delete all read notifications

### WebSocket Events

Connect to `ws://localhost:3000/notifications` with auth:

```typescript
const socket = io('http://localhost:3000/notifications', {
  auth: { userId: 'user-id' }
});

// Listen for new notifications
socket.on('new_notification', (notification) => {
  console.log('New notification:', notification);
});

// Listen for unread count updates
socket.on('unread_count_update', ({ count }) => {
  console.log('Unread count:', count);
});
```

## Usage in Other Services

### Creating Notifications

Inject `NotificationsService` and `NotificationsGateway`:

```typescript
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

constructor(
  private notificationsService: NotificationsService,
  private notificationsGateway: NotificationsGateway,
) {}
```

### Example: Resource Unlock

```typescript
// When unlocking a resource for a user
const notification = await this.notificationsService.notifyResourceUnlock(
  userId,
  'Setting SMART Goals',
  resourceId
);

// Send real-time notification
this.notificationsGateway.sendNotificationToUser(userId, notification);

// Update unread count
const count = await this.notificationsService.getUnreadCount(userId);
this.notificationsGateway.sendUnreadCountUpdate(userId, count);
```

### Example: Achievement Earned

```typescript
const notification = await this.notificationsService.notifyAchievementEarned(
  userId,
  'First Steps',
  achievementId
);

this.notificationsGateway.sendNotificationToUser(userId, notification);
```

### Example: Cohort-wide Notification

```typescript
// Notify all fellows in a cohort
await this.notificationsService.sendCohortNotification(
  cohortId,
  'SESSION_REMINDER',
  'Live Session Tomorrow',
  'Join us for Week 1: Career Foundations tomorrow at 2 PM EST',
  { sessionId }
);
```

## Integration Points

### 1. Resources Service

Add to `resources.service.ts`:

```typescript
// When unlocking resources 6 days before session
async unlockSessionResources(sessionId: string) {
  // ... existing unlock logic ...
  
  // Send notifications
  for (const fellow of fellows) {
    await this.notificationsService.notifyResourceUnlock(
      fellow.id,
      resource.title,
      resource.id
    );
  }
}
```

### 2. Achievements Service

Add to `achievements.service.ts`:

```typescript
async awardAchievement(userId: string, achievementId: string) {
  // ... existing logic ...
  
  const achievement = await this.prisma.achievement.findUnique({
    where: { id: achievementId }
  });
  
  await this.notificationsService.notifyAchievementEarned(
    userId,
    achievement.name,
    achievementId
  );
}
```

### 3. Discussions Service

Add to `discussions.service.ts`:

```typescript
async createComment(discussionId: string, userId: string, content: string) {
  // ... existing logic ...
  
  const discussion = await this.prisma.discussion.findUnique({
    where: { id: discussionId },
    include: { user: true }
  });
  
  // Notify discussion author
  if (discussion.userId !== userId) {
    await this.notificationsService.notifyDiscussionReply(
      discussion.userId,
      commenter.firstName + ' ' + commenter.lastName,
      discussion.title,
      discussionId
    );
  }
}
```

### 4. Leaderboard Service

Add to `leaderboard.service.ts`:

```typescript
async updateLeaderboardRankings() {
  // ... calculate new rankings ...
  
  // Notify users whose rank improved
  for (const user of usersWithImprovedRank) {
    await this.notificationsService.notifyLeaderboardUpdate(
      user.id,
      user.newRank,
      user.oldRank
    );
  }
}
```

### 5. Points Service

Add point cap warnings:

```typescript
async awardPoints(userId: string, points: number) {
  // ... existing logic ...
  
  // Check if approaching cap (e.g., 90% of cap)
  if (user.currentMonthPoints >= user.monthlyPointsCap * 0.9) {
    await this.notificationsService.notifyPointCapWarning(
      userId,
      user.currentMonthPoints,
      user.monthlyPointsCap
    );
  }
}
```

## Scheduled Jobs (Optional)

For automated reminders, consider using NestJS Schedule:

```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class NotificationScheduler {
  constructor(private notificationsService: NotificationsService) {}

  // Run every day at 9 AM
  @Cron('0 9 * * *')
  async sendDailyReminders() {
    // Find incomplete resources due soon
    // Send reminders
  }

  // Run every Monday at 8 AM
  @Cron('0 8 * * 1')
  async sendWeeklyDigest() {
    // Send weekly progress digest
  }
}
```

## Email Integration (Next Step)

For email notifications, install Nodemailer or use SendGrid:

```bash
npm install @nestjs-modules/mailer nodemailer
```

Then create an email service that listens to notification events and sends emails for important notifications.

## Testing

Test with curl:

```bash
# Get notifications
curl -X GET http://localhost:3000/notifications \
  -H "Authorization: Bearer <your-jwt-token>"

# Mark as read
curl -X PATCH http://localhost:3000/notifications/:id/read \
  -H "Authorization: Bearer <your-jwt-token>"

# Get unread count
curl -X GET http://localhost:3000/notifications/unread-count \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Next Steps

1. Frontend components (Todo #4)
2. Email integration
3. Push notifications (mobile)
4. Notification preferences (allow users to configure which notifications they want)
5. Digest emails (daily/weekly summaries)
