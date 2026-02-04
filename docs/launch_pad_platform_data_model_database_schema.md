# LaunchPad Fellowship Platform
## Data Model & Database Schema Specification

---

## 1. Purpose of This Document

This document defines the **complete data model** for the LaunchPad Fellowship gamified platform. It is designed to:
- Serve as a single source of truth for backend development
- Be safe for AI-assisted code generation (vibecode-ready)
- Prevent schema ambiguity, data leakage, or analytics gaps

All entities, fields, relationships, and constraints are explicitly defined.

---

## 2. Core Design Assumptions

- Relational database: **PostgreSQL**
- UUIDs used for all primary keys
- Soft deletes preferred for auditability
- Time is stored in UTC
- Analytics events are immutable

---

## 3. User & Identity Models

### 3.1 users

Stores all platform users.

Fields:
- id (UUID, PK)
- first_name (string)
- last_name (string)
- email (string, unique, indexed)
- password_hash (string)
- role (enum: FELLOW | FACILITATOR | ADMIN)
- cohort_id (UUID, FK → cohorts.id, nullable)
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)

Constraints:
- Email must be unique
- Role determines access permissions


---

## 4. Cohorts & Program Structure

### 4.1 cohorts

Fields:
- id (UUID, PK)
- name (string)
- start_date (date)
- end_date (date)
- status (enum: UPCOMING | ACTIVE | COMPLETED)
- created_at (timestamp)


---

## 5. Sessions & Scheduling

### 5.1 sessions

Represents live fellowship sessions.

Fields:
- id (UUID, PK)
- cohort_id (UUID, FK → cohorts.id)
- title (string)
- description (text)
- month_theme (string)
- session_date (date)
- start_time (time)
- duration_minutes (integer)
- session_type (enum: CORE | STORYTELLING)
- facilitator_id (UUID, FK → users.id, nullable)
- created_at (timestamp)


---

## 6. Learning Resources

### 6.1 resources

Represents articles, videos, or external materials.

Fields:
- id (UUID, PK)
- session_id (UUID, FK → sessions.id)
- title (string)
- description (text)
- resource_type (enum: ARTICLE | VIDEO)
- is_core (boolean)
- estimated_minutes (integer)
- unlock_date (date)
- created_at (timestamp)

Rules:
- unlock_date = session_date - 8 days


---

## 7. Resource Progress Tracking

### 7.1 resource_progress

Tracks user interaction with resources.

Fields:
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- resource_id (UUID, FK → resources.id)
- status (enum: NOT_STARTED | IN_PROGRESS | COMPLETED)
- time_spent_seconds (integer)
- completion_percentage (integer)
- last_accessed_at (timestamp)

Constraints:
- Unique (user_id, resource_id)


---

## 8. Discussions & Social Engagement

### 8.1 discussions

Fields:
- id (UUID, PK)
- resource_id (UUID, FK → resources.id)
- prompt (text)
- created_at (timestamp)


### 8.2 discussion_comments

Fields:
- id (UUID, PK)
- discussion_id (UUID, FK → discussions.id)
- user_id (UUID, FK → users.id)
- content (text)
- parent_comment_id (UUID, self-referential, nullable)
- created_at (timestamp)


---

## 9. Gamification System

### 9.1 points_log

Immutable log of all points awarded.

Fields:
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- source (enum: RESOURCE | DISCUSSION | QUIZ | SESSION | ADMIN)
- source_id (UUID)
- points (integer)
- created_at (timestamp)


### 9.2 achievements

Fields:
- id (UUID, PK)
- name (string)
- description (text)
- points_value (integer)
- created_at (timestamp)


### 9.3 user_achievements

Fields:
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- achievement_id (UUID, FK → achievements.id)
- awarded_at (timestamp)


---

## 10. Leaderboards

### 10.1 monthly_leaderboards

Fields:
- id (UUID, PK)
- cohort_id (UUID, FK → cohorts.id)
- month (string, YYYY-MM)
- created_at (timestamp)


### 10.2 leaderboard_entries

Fields:
- id (UUID, PK)
- leaderboard_id (UUID, FK → monthly_leaderboards.id)
- user_id (UUID, FK → users.id)
- total_points (integer)
- rank (integer)


---

## 11. Quizzes

### 11.1 quizzes

Fields:
- id (UUID, PK)
- session_id (UUID, FK → sessions.id)
- title (string)
- duration_minutes (integer)
- multiplier (integer)
- is_active (boolean)


### 11.2 quiz_questions

Fields:
- id (UUID, PK)
- quiz_id (UUID, FK → quizzes.id)
- question_text (text)
- question_type (enum: MCQ | TRUE_FALSE)


### 11.3 quiz_responses

Fields:
- id (UUID, PK)
- quiz_question_id (UUID, FK → quiz_questions.id)
- user_id (UUID, FK → users.id)
- selected_option (string)
- is_correct (boolean)
- created_at (timestamp)


---

## 12. Analytics & Events

### 12.1 engagement_events

Immutable event stream.

Fields:
- id (UUID, PK)
- user_id (UUID, FK → users.id)
- event_type (string)
- entity_type (string)
- entity_id (UUID)
- metadata (JSONB)
- created_at (timestamp)


---

## 13. Session Analytics

### 13.1 session_analytics

Fields:
- id (UUID, PK)
- session_id (UUID, FK → sessions.id)
- engagement_score (integer)
- dropoff_points (JSONB)
- analyzed_at (timestamp)


---

## 14. Audit Logs

### 14.1 admin_audit_logs

Fields:
- id (UUID, PK)
- admin_id (UUID, FK → users.id)
- action (string)
- target_entity (string)
- target_id (UUID)
- created_at (timestamp)


---

## 15. Indexing & Performance Notes

Recommended Indexes:
- users.email
- resource_progress.user_id
- engagement_events.user_id
- points_log.user_id


---

## 16. Next Document

**API Specification & Endpoint Contracts**

This will define how the frontend communicates with this data model safely and predictably.
