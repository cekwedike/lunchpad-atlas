# LaunchPad Fellowship Platform
## API Specification & Endpoint Contracts

---

## 1. Purpose of This Document

This document defines the **complete API contract** between the frontend (React/Next.js) and backend (NestJS). It is written to:
- Be contract-first and unambiguous
- Prevent frontend/backend desync
- Be safe for AI-assisted backend and frontend code generation

All endpoints assume **JSON over HTTPS**.

---

## 2. API Design Standards

### 2.1 General Rules
- Base URL: `/` (no version prefix currently)
- Auth via Bearer JWT (`Authorization: Bearer <token>`)
- All endpoints require JWT authentication unless specified otherwise
- Role-based access enforced via `@Roles()` decorator where noted

### 2.2 Error Response Format
```json
{
  "statusCode": 400,
  "message": "Human readable message",
  "error": "BadRequest"
}
```

---

## 3. Authentication (`/auth`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/auth/setup` | None | - | Check if initial admin setup is needed |
| POST | `/auth/setup` | None | - | Create initial admin account |
| POST | `/auth/register` | JWT | ADMIN | Register a new user (fellow/facilitator) |
| POST | `/auth/login` | None | - | Login with email/password |
| POST | `/auth/refresh` | None | - | Refresh access token |
| GET | `/auth/me` | JWT | Any | Get current authenticated user |

---

## 4. Users & Profile (`/users`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/users/me` | JWT | Any | Get current user profile |
| PUT | `/users/me` | JWT | Any | Update profile (full replace) |
| PATCH | `/users/me` | JWT | Any | Update profile (partial) |
| POST | `/users/me/change-password` | JWT | Any | Change password |
| GET | `/users/me/stats` | JWT | Any | Get user statistics |
| GET | `/users/me/achievements` | JWT | Any | Get user's achievements |
| GET | `/users/me/points` | JWT | Any | Get user's points history |

---

## 5. Sessions (`/sessions`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/sessions` | JWT | Any | Get sessions for user's cohort |

---

## 6. Cohorts (`/cohorts`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/cohorts` | JWT | Any | Get available cohorts |

---

## 7. Resources (`/resources`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/resources` | JWT | Any | Get resources with query filters |
| GET | `/resources/engagement/report` | JWT | Any | Get engagement quality report for user |
| GET | `/resources/engagement/alerts` | JWT | FACILITATOR, ADMIN | Get skimming detection alerts |
| GET | `/resources/:id` | JWT | Any | Get single resource by ID |
| POST | `/resources/admin/unlock` | JWT | ADMIN, FACILITATOR | Manually unlock a resource for a user |
| POST | `/resources/:id/complete` | JWT | Any | Mark resource as complete (validates engagement) |
| POST | `/resources/:id/track` | JWT | Any | Track engagement (scroll, video, time) |
| POST | `/resources/:id/track-video` | JWT | Any | Track video engagement metrics |

### Resource Completion Response
```json
{
  "state": "COMPLETED",
  "completedAt": "2026-02-15T00:00:00Z",
  "pointsAwarded": 120,
  "qualityBonus": 10,
  "timelinessBonus": 10,
  "cappedMessage": null,
  "newAchievements": []
}
```

---

## 8. Discussions (`/discussions`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/discussions` | JWT | Any | List discussions (with pagination/filters) |
| GET | `/discussions/topics` | JWT | Any | Get discussion topics |
| GET | `/discussions/pending-count` | JWT | FACILITATOR, ADMIN | Count pending approval discussions |
| GET | `/discussions/ai-status` | JWT | ADMIN | Get AI scoring status |
| GET | `/discussions/quality/top` | JWT | Any | Get top quality discussions |
| GET | `/discussions/recent` | JWT | Any | Get recent discussions |
| GET | `/discussions/:id` | JWT | Any | Get single discussion |
| POST | `/discussions` | JWT | Any | Create discussion (100-word min) |
| POST | `/discussions/:id/like` | JWT | Any | Toggle like on discussion |
| GET | `/discussions/:id/comments` | JWT | Any | Get comments for discussion |
| POST | `/discussions/:id/comments` | JWT | Any | Create comment (2 pts, 3/resource cap) |
| DELETE | `/discussions/:id` | JWT | Author/FACILITATOR/ADMIN | Delete discussion |
| POST | `/discussions/:id/pin` | JWT | FACILITATOR, ADMIN | Pin/unpin discussion |
| POST | `/discussions/:id/lock` | JWT | FACILITATOR, ADMIN | Lock/unlock discussion |
| POST | `/discussions/:id/approve` | JWT | FACILITATOR, ADMIN | Approve discussion |
| POST | `/discussions/:id/score-quality` | JWT | ADMIN | Trigger AI quality scoring |
| POST | `/discussions/:id/quality-visibility` | JWT | ADMIN | Toggle quality score visibility |
| DELETE | `/discussions/comments/:commentId` | JWT | Author/FACILITATOR/ADMIN | Delete comment |
| POST | `/discussions/comments/:commentId/pin` | JWT | FACILITATOR, ADMIN | Pin comment |
| POST | `/discussions/comments/:commentId/reactions` | JWT | Any | Add reaction to comment |
| POST | `/discussions/comments/:commentId/score-quality` | JWT | ADMIN | Score comment quality |
| POST | `/discussions/comments/:commentId/quality-visibility` | JWT | ADMIN | Toggle comment quality visibility |
| POST | `/discussions/comments/:commentId` | JWT | Author | Update comment |

---

## 9. Leaderboard (`/leaderboard`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/leaderboard` | JWT | Any | Get leaderboard for a month |
| GET | `/leaderboard/rank` | JWT | Any | Get current user's rank |
| GET | `/leaderboard/months` | JWT | Any | Get available leaderboard months |
| POST | `/leaderboard/adjust-points` | JWT | ADMIN, FACILITATOR | Adjust points for a fellow |

---

## 10. Achievements (`/achievements`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/achievements` | JWT | Any | Get all achievement definitions |
| GET | `/achievements/my` | JWT | Any | Get user's unlocked achievements |

---

## 11. Quizzes (`/quizzes`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/quizzes/my-quizzes` | JWT | Any | Get quizzes available to user |
| GET | `/quizzes/:id` | JWT | Any | Get quiz details |
| GET | `/quizzes/:id/questions` | JWT | Any | Get quiz questions |
| GET | `/quizzes/:id/attempts` | JWT | Any | Get user's quiz attempts |
| POST | `/quizzes/:id/submit` | JWT | Any | Submit quiz answers |

---

## 12. Live Quizzes (`/live-quiz`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/live-quiz` | JWT | FACILITATOR, ADMIN | Create live quiz |
| GET | `/live-quiz/my` | JWT | Any | Get user's live quizzes |
| GET | `/live-quiz/:id` | JWT | Any | Get live quiz details |
| GET | `/live-quiz/cohort/:cohortId` | JWT | Any | Get live quizzes for cohort |
| GET | `/live-quiz/session/:sessionId` | JWT | Any | Get live quizzes for session |
| POST | `/live-quiz/:id/start` | JWT | FACILITATOR, ADMIN | Start a live quiz |
| POST | `/live-quiz/:id/next-question` | JWT | FACILITATOR, ADMIN | Advance to next question |
| POST | `/live-quiz/:id/complete` | JWT | FACILITATOR, ADMIN | Complete/end live quiz |
| POST | `/live-quiz/:id/join` | JWT | Any | Join a live quiz |
| POST | `/live-quiz/answer` | JWT | Any | Submit answer in live quiz |
| GET | `/live-quiz/:id/leaderboard` | JWT | Any | Get live quiz leaderboard |
| GET | `/live-quiz/participant/:participantId/answers` | JWT | Any | Get participant answers |
| DELETE | `/live-quiz/:id` | JWT | FACILITATOR, ADMIN | Delete live quiz |

---

## 13. Chat (`/chat`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/chat/channels` | JWT | ADMIN, FACILITATOR | Create chat channel |
| GET | `/chat/channels/cohort/:cohortId` | JWT | Any | Get channels for cohort |
| GET | `/chat/channels` | JWT | ADMIN | Get all channels |
| GET | `/chat/channels/:channelId` | JWT | Any | Get channel details |
| PATCH | `/chat/channels/:channelId/archive` | JWT | ADMIN, FACILITATOR | Archive channel |
| PATCH | `/chat/channels/:channelId/lock` | JWT | ADMIN, FACILITATOR | Lock channel |
| DELETE | `/chat/channels/:channelId` | JWT | ADMIN, FACILITATOR | Delete channel |
| POST | `/chat/messages` | JWT | Any | Send message |
| GET | `/chat/messages/:channelId` | JWT | Any | Get messages in channel |
| DELETE | `/chat/messages/:messageId` | JWT | Author/ADMIN/FACILITATOR | Delete message |
| PATCH | `/chat/messages/:messageId/flag` | JWT | ADMIN, FACILITATOR | Flag message |
| GET | `/chat/direct` | JWT | Any | Get direct message conversations |
| POST | `/chat/direct/:userId` | JWT | Any | Send direct message |
| POST | `/chat/channels/initialize/:cohortId` | JWT | ADMIN | Initialize default channels |

---

## 14. Attendance (`/attendance`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/attendance/session/:sessionId/qr-code` | JWT | FACILITATOR, ADMIN | Generate QR code for check-in |
| POST | `/attendance/check-in/:sessionId` | JWT | Any | Check in to session |
| POST | `/attendance/check-out/:sessionId` | JWT | Any | Check out of session |
| GET | `/attendance/session/:sessionId/me` | JWT | Any | Get own attendance for session |
| GET | `/attendance/me` | JWT | Any | Get all attendance records |
| GET | `/attendance/session/:sessionId/report` | JWT | FACILITATOR, ADMIN | Get attendance report |
| GET | `/attendance/cohort/:cohortId/stats` | JWT | FACILITATOR, ADMIN | Get cohort attendance stats |
| PATCH | `/attendance/session/:sessionId/user/:userId/excuse` | JWT | FACILITATOR, ADMIN | Mark attendance as excused |

---

## 15. Notifications (`/notifications`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/notifications` | JWT | Any | Get user's notifications |
| GET | `/notifications/unread-count` | JWT | Any | Get unread notification count |
| PATCH | `/notifications/:id/read` | JWT | Any | Mark notification as read |
| PATCH | `/notifications/mark-all-read` | JWT | Any | Mark all notifications as read |
| DELETE | `/notifications/:id` | JWT | Any | Delete notification |
| DELETE | `/notifications/read/all` | JWT | Any | Delete all read notifications |

---

## 16. Facilitator (`/facilitator`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/facilitator/cohorts/:cohortId/stats` | JWT | FACILITATOR, ADMIN | Get cohort statistics |
| GET | `/facilitator/cohorts/:cohortId/fellows` | JWT | FACILITATOR, ADMIN | Get fellows in cohort |
| GET | `/facilitator/cohorts/:cohortId/resources` | JWT | FACILITATOR, ADMIN | Get cohort resources |

---

## 17. Session Analytics (`/session-analytics`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/session-analytics/process/:sessionId` | JWT | FACILITATOR, ADMIN | Process session analytics (AI) |
| GET | `/session-analytics/session/:sessionId` | JWT | Any | Get session analytics |
| GET | `/session-analytics/cohort/:cohortId` | JWT | Any | Get cohort analytics |
| GET | `/session-analytics/cohort/:cohortId/insights` | JWT | FACILITATOR, ADMIN | Get AI insights |
| GET | `/session-analytics/export/session/:sessionId/csv` | JWT | FACILITATOR, ADMIN | Export session CSV |
| GET | `/session-analytics/export/cohort/:cohortId/csv` | JWT | FACILITATOR, ADMIN | Export cohort CSV |
| GET | `/session-analytics/export/resource-progress/:sessionId/csv` | JWT | FACILITATOR, ADMIN | Export progress CSV |
| GET | `/session-analytics/export/leaderboard/:cohortId/csv` | JWT | FACILITATOR, ADMIN | Export leaderboard CSV |
| GET | `/session-analytics/summary/:cohortId` | JWT | FACILITATOR, ADMIN | Get analytics summary |
| POST | `/session-analytics/events` | JWT | Any | Track analytics event |

---

## 18. Admin (`/admin`)

### Cohort Management
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/admin/cohorts` | ADMIN | List all cohorts |
| GET | `/admin/cohorts/:id/members` | ADMIN, FACILITATOR, FELLOW | Get cohort members |
| POST | `/admin/cohorts` | ADMIN | Create cohort |
| PATCH | `/admin/cohorts/:id` | ADMIN | Update cohort |
| DELETE | `/admin/cohorts/:id` | ADMIN | Delete cohort |
| POST | `/admin/cohorts/:id/duplicate` | ADMIN | Duplicate cohort with sessions/resources |
| POST | `/admin/cohorts/:id/facilitators` | ADMIN | Assign facilitator to cohort |
| DELETE | `/admin/cohorts/:id/facilitators/:userId` | ADMIN | Remove facilitator from cohort |

### Session Management
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/admin/sessions` | ADMIN, FACILITATOR | Create session |
| PATCH | `/admin/sessions/:id` | ADMIN, FACILITATOR | Update session |
| GET | `/admin/sessions/:id/attendance` | ADMIN, FACILITATOR | Get session attendance |
| POST | `/admin/sessions/:id/attendance` | ADMIN, FACILITATOR | Record attendance |
| POST | `/admin/sessions/:id/ai-review` | ADMIN, FACILITATOR | Trigger AI review |
| POST | `/admin/sessions/:id/award-points` | ADMIN, FACILITATOR | Award session points |
| POST | `/admin/sessions/:id/ai-chat` | ADMIN, FACILITATOR | AI chat about session |
| DELETE | `/admin/sessions/:id/analytics` | ADMIN, FACILITATOR | Delete session analytics |

### Resource Management
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/admin/resources` | ADMIN, FACILITATOR | Create resource (core=100pts, optional=50pts) |
| GET | `/admin/resources` | ADMIN, FACILITATOR | List all resources |
| GET | `/admin/sessions/:sessionId/resources` | ADMIN, FACILITATOR | Get resources for session |
| PATCH | `/admin/resources/:id` | ADMIN, FACILITATOR | Update resource |
| PATCH | `/admin/resources/:id/lock` | ADMIN, FACILITATOR | Toggle resource lock state |
| DELETE | `/admin/resources/:id` | ADMIN, FACILITATOR | Delete resource |

### Quiz Management
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/admin/quizzes/cohort/:cohortId` | ADMIN, FACILITATOR | Get quizzes for cohort |
| POST | `/admin/quizzes` | ADMIN, FACILITATOR | Create quiz |
| PATCH | `/admin/quizzes/:quizId` | ADMIN, FACILITATOR | Update quiz |
| DELETE | `/admin/quizzes/:quizId` | ADMIN, FACILITATOR | Delete quiz |
| POST | `/admin/quizzes/generate-ai` | ADMIN, FACILITATOR | Generate quiz via AI |
| POST | `/admin/live-quiz/:liveQuizId/notify` | ADMIN, FACILITATOR | Notify users about live quiz |

### User Management
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/admin/users` | ADMIN | List all users |
| GET | `/admin/users/:id` | ADMIN | Get user details |
| GET | `/admin/users/:id/statistics` | ADMIN | Get user statistics |
| GET | `/admin/users/:id/activity` | ADMIN | Get user activity log |
| PUT | `/admin/users/:id/role` | ADMIN | Change user role |
| PUT | `/admin/users/:id/cohort` | ADMIN | Assign user to cohort |
| PATCH | `/admin/users/:id/facilitator` | ADMIN | Update facilitator assignment |
| PATCH | `/admin/users/:id/reset-points` | ADMIN | Reset user points |
| PUT | `/admin/users/bulk/assign-cohort` | ADMIN | Bulk assign cohort |
| PUT | `/admin/users/bulk/update-role` | ADMIN | Bulk update roles |
| DELETE | `/admin/users/:id` | ADMIN | Delete user |
| PATCH | `/admin/users/:id/suspend` | ADMIN | Suspend user |
| PATCH | `/admin/users/:id/unsuspend` | ADMIN | Unsuspend user |
| PATCH | `/admin/users/:id/flag` | ADMIN | Flag user |
| PATCH | `/admin/users/:id/unflag` | ADMIN | Unflag user |

### System
| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/admin/audit-logs` | ADMIN | Get audit logs |
| GET | `/admin/metrics` | ADMIN | Get system metrics |
| GET | `/admin/achievements` | ADMIN | Get achievement definitions |
| PATCH | `/admin/achievements/:id` | ADMIN | Update achievement |

---

## 19. Curricula (`/curricula`)

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| POST | `/curricula/:cohortId` | JWT | Any | Create cohort curriculum |
| GET | `/curricula/:cohortId` | JWT | Any | Get cohort curriculum |
| PUT | `/curricula/:cohortId` | JWT | Any | Update cohort curriculum |

---

## 20. Health & System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | None | API info |
| GET | `/health` | None | Health check |
