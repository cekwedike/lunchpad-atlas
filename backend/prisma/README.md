# Database Setup

## Prerequisites

- PostgreSQL 14+ installed and running
- Database connection URL configured in `.env`

## Quick Start

```bash
# Generate Prisma Client
npx prisma generate

# Create database and run migrations
npx prisma migrate dev --name init

# Seed the database with initial data
npx prisma db seed
```

## Database Schema Overview

The ATLAS platform uses PostgreSQL with the following tables:

### Core Tables
- **users** - All platform users (Fellows, Facilitators, Admins)
- **cohorts** - Fellowship cohort groups
- **sessions** - 16 Saturday sessions per cohort
- **resources** - 91 learning resources (videos, articles, exercises, quizzes)
- **resource_progress** - Tracks user progress through resources

### Social Learning
- **discussions** - Resource-specific discussion threads
- **discussion_comments** - Comments on discussions

### Gamification
- **points_log** - Points earned by users
- **achievements** - Available achievements
- **user_achievements** - Achievements unlocked by users
- **monthly_leaderboards** - Monthly leaderboards per cohort
- **leaderboard_entries** - Individual user rankings

### Quizzes
- **quizzes** - Quiz assessments per session
- **quiz_questions** - Quiz questions with multiple choice options
- **quiz_responses** - User quiz submissions and scores

### Analytics
- **engagement_events** - User activity tracking
- **session_analytics** - Session-level metrics
- **admin_audit_logs** - Admin action audit trail

## Seeded Data

After running `npx prisma db seed`, you'll have:

- **Test Users:**
  - Admin: `admin@thrivehub.com` / `admin123`
  - Facilitator: `facilitator@thrivehub.com` / `facilitator123`
  - Fellows: `fellow1@example.com` / `fellow123` (3 users)

- **Sample Data:**
  - 1 cohort (April 2026 Cohort A)
  - 16 sessions (4 months)
  - 7 resources for Session 1
  - 10 achievements
  - 1 quiz with 3 questions

## Common Commands

```bash
# View database in Prisma Studio
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Deploy migrations to production
npx prisma migrate deploy

# Format schema file
npx prisma format

# Check for schema issues
npx prisma validate
```

## Enums

### UserRole
- `FELLOW` - Program participant
- `FACILITATOR` - Cohort facilitator/mentor
- `ADMIN` - Platform administrator

### ResourceType
- `VIDEO` - Video content
- `ARTICLE` - Article/blog post
- `EXERCISE` - Practical exercise
- `QUIZ` - Assessment quiz

### ResourceState
- `LOCKED` - Not yet accessible (before unlock date)
- `UNLOCKED` - Available to access
- `IN_PROGRESS` - Started but not completed
- `COMPLETED` - Fully completed with points awarded

### CohortState
- `PENDING` - Not yet started
- `ACTIVE` - Currently running
- `COMPLETED` - Finished
- `ARCHIVED` - Historical record

### EventType
- `RESOURCE_VIEW` - User views a resource
- `RESOURCE_COMPLETE` - User completes a resource
- `DISCUSSION_POST` - User creates a discussion
- `DISCUSSION_COMMENT` - User comments on a discussion
- `QUIZ_SUBMIT` - User submits a quiz
- `CHAT_MESSAGE` - User sends a chat message
- `SESSION_ATTEND` - User attends a session

### AchievementType
- `MILESTONE` - Completion-based (e.g., complete 10 resources)
- `STREAK` - Consistency-based (e.g., 7-day streak)
- `SOCIAL` - Engagement-based (e.g., 5 discussion posts)
- `LEADERBOARD` - Ranking-based (e.g., top 3 in month)

## Resource Locking Logic

Resources unlock **8 days before** their scheduled session date:
- Session on April 11 → Resources unlock April 3
- This gives Fellows a full week to engage with content before the Saturday session

## Points System

- **Videos**: 150 points (core), 50 points (optional)
- **Articles**: 100 points (core), 50 points (optional)
- **Quizzes**: 200 points (must pass with 70%+)
- **Discussions**: 25 points per post, 10 points per comment
- **Achievements**: 50-1000 points depending on difficulty

## Anti-Skimming Validation

The `resource_progress.validatedAt` field tracks when AI validation confirms genuine engagement:
- Video: Minimum watch time threshold
- Article: Reading time analysis
- Exercise: Completion evidence required

Points are only awarded after validation passes.
