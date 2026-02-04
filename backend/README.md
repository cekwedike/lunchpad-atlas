# Backend - ATLAS Platform

NestJS backend API for the ATLAS gamified learning platform.

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching, leaderboards, quiz sessions
- **JWT** - Authentication
- **Passport** - Auth strategies
- **Bull** - Background jobs (optional)

## Directory Structure

```
backend/
├── src/
│   ├── auth/                 # Authentication module
│   │   ├── guards/          # Auth guards (JWT, Role)
│   │   ├── strategies/      # Passport strategies
│   │   └── decorators/      # Custom decorators
│   ├── users/               # User management
│   ├── cohorts/             # Cohort management
│   ├── sessions/            # Session management
│   ├── resources/           # Resource management & locking
│   ├── resource-progress/   # Progress tracking
│   ├── gamification/        # Points, achievements, leaderboards
│   ├── discussions/         # Discussion threads & comments
│   ├── quizzes/             # Quiz system
│   ├── chat/                # Chat system
│   ├── analytics/           # Event tracking & analytics
│   ├── admin/               # Admin tools
│   ├── common/              # Shared utilities
│   │   ├── guards/         # Global guards
│   │   ├── filters/        # Exception filters
│   │   ├── interceptors/   # Interceptors
│   │   └── decorators/     # Decorators
│   └── main.ts             # Application entry point
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Database migrations
│   └── seed.ts             # Seed script
├── test/                   # E2E tests
└── .env                    # Environment variables
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Start PostgreSQL and Redis (Docker)
docker-compose up -d

# Run database migrations
pnpm prisma migrate dev

# Seed database with curriculum data
pnpm prisma db seed

# Run development server
pnpm start:dev

# Build for production
pnpm build

# Start production server
pnpm start:prod
```

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/atlas"
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# AI Services
OPENAI_API_KEY="your-openai-api-key"
SESSION_ANALYZER_URL="http://localhost:8000"

# App
PORT=4000
NODE_ENV="development"
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register user (admin only)
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/users/me` - Get current user

### Cohorts & Sessions
- `GET /api/v1/cohorts` - List cohorts
- `GET /api/v1/sessions` - List sessions
- `POST /api/v1/admin/cohorts` - Create cohort
- `POST /api/v1/admin/sessions` - Create session

### Resources
- `GET /api/v1/sessions/:id/resources` - Get session resources
- `POST /api/v1/resources/:id/progress` - Update progress

### Gamification
- `GET /api/v1/leaderboards/current` - Current leaderboard
- `GET /api/v1/gamification/points/me` - User points
- `GET /api/v1/gamification/achievements` - Achievements

### Discussions
- `GET /api/v1/resources/:id/discussion` - Get discussion
- `POST /api/v1/discussions/:id/comments` - Post comment

### Quizzes
- `GET /api/v1/quizzes/active` - Get active quiz
- `POST /api/v1/quizzes/:id/responses` - Submit response

### Analytics
- `POST /api/v1/analytics/events` - Track event

### Admin
- `POST /api/v1/admin/quizzes/:id/toggle` - Toggle quiz
- `POST /api/v1/admin/sessions/:id/analytics` - Upload analytics
- `POST /api/v1/admin/points/:userId` - Adjust points

## Database Schema

See [../docs/launch_pad_platform_data_model_database_schema.md](../docs/launch_pad_platform_data_model_database_schema.md) for complete schema.

Key tables:
- `users` - User accounts
- `cohorts` - Fellowship cohorts
- `sessions` - Learning sessions
- `resources` - Content items
- `resource_progress` - User progress
- `discussions` & `discussion_comments` - Social learning
- `points_log` - Immutable points history
- `achievements` & `user_achievements` - Badge system
- `monthly_leaderboards` & `leaderboard_entries` - Rankings
- `quizzes`, `quiz_questions`, `quiz_responses` - Assessments
- `engagement_events` - Event stream
- `session_analytics` - AI insights
- `admin_audit_logs` - Admin actions

## Features to Implement

- [ ] Authentication & RBAC
- [ ] User management
- [ ] Cohort & session management
- [ ] Resource management with auto-unlocking
- [ ] Progress tracking with anti-skimming
- [ ] Points calculation engine
- [ ] Achievements system
- [ ] Leaderboard with monthly resets
- [ ] Discussion threads with validation
- [ ] Live quiz system with Redis
- [ ] Chat system
- [ ] Event tracking pipeline
- [ ] Session analytics with AI integration
- [ ] Admin control panel APIs

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```
