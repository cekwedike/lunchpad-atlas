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
- Base URL: `/api/v1`
- Auth via Bearer JWT
- All responses include `success` boolean
- Errors follow a standard structure

### 2.2 Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message"
  }
}
```

---

## 3. Authentication & Authorization

### 3.1 Register (Admin only)
**POST** `/auth/register`

Request:
```json
{
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "FELLOW | FACILITATOR"
}
```

---

### 3.2 Login
**POST** `/auth/login`

Request:
```json
{
  "email": "string",
  "password": "string"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "jwt",
    "refreshToken": "jwt"
  }
}
```

---

## 4. User & Profile APIs

### 4.1 Get Current User
**GET** `/users/me`

---

### 4.2 Update Profile
**PUT** `/users/me`

Request:
```json
{
  "firstName": "string",
  "lastName": "string"
}
```

---

## 5. Cohort & Session APIs

### 5.1 Get Active Cohort Sessions
**GET** `/sessions`

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "sessionDate": "date",
      "sessionType": "CORE | STORYTELLING",
      "monthTheme": "string"
    }
  ]
}
```

---

## 6. Resource APIs

### 6.1 Get Resources for Session
**GET** `/sessions/{sessionId}/resources`

---

### 6.2 Update Resource Progress
**POST** `/resources/{resourceId}/progress`

Request:
```json
{
  "status": "IN_PROGRESS | COMPLETED",
  "timeSpentSeconds": 120,
  "completionPercentage": 85
}
```

---

## 7. Discussion APIs

### 7.1 Get Discussion Prompt
**GET** `/resources/{resourceId}/discussion`

---

### 7.2 Post Comment
**POST** `/discussions/{discussionId}/comments`

Request:
```json
{
  "content": "string",
  "parentCommentId": "uuid | null"
}
```

---

## 8. Gamification & Leaderboards

### 8.1 Get Current Leaderboard
**GET** `/leaderboards/current`

---

### 8.2 Get User Points Summary
**GET** `/gamification/points/me`

---

## 9. Quiz APIs

### 9.1 Get Active Quiz
**GET** `/quizzes/active`

---

### 9.2 Submit Quiz Response
**POST** `/quizzes/{quizId}/responses`

Request:
```json
{
  "questionId": "uuid",
  "selectedOption": "string"
}
```

---

## 10. Admin APIs

### 10.1 Create Session
**POST** `/admin/sessions`

---

### 10.2 Upload Session Transcript
**POST** `/admin/sessions/{sessionId}/analytics`

Payload:
- transcript (text) or video file

---

### 10.3 Toggle Quiz Availability
**POST** `/admin/quizzes/{quizId}/toggle`

---

## 11. Analytics APIs

### 11.1 Track Event
**POST** `/analytics/events`

Request:
```json
{
  "eventType": "string",
  "entityType": "string",
  "entityId": "uuid",
  "metadata": {}
}
```

---

## 12. Access Control Notes

- Fellows cannot access admin routes
- Facilitators have read-only session analytics
- Admins can override points manually

---

## 13. Next Document

**Gamification & Scoring Rules Specification**

This will define exact point values, achievements, resets, and anti-gamin