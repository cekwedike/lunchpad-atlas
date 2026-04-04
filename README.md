# ATLAS - Accelerating Talent for Leadership & Success

> **THRiVE Hub LaunchPad Fellowship Platform**  
> Empowering African Youth For Global Opportunities

ATLAS is a gamified Learning Management System designed for the THRiVE Hub LaunchPad Fellowship - a 4-month intensive program preparing young African professionals to compete in the global job market.

## 🎯 Platform Overview

ATLAS transforms traditional learning into an engaging, accountable, and measurable experience through:
- **Resource Locking System**: Content unlocks 8 days before each session
- **Anti-Skimming Validation**: Deep engagement tracking (scroll depth, watch time, minimum thresholds)
- **Gamification Engine**: Points, achievements, and monthly leaderboards
- **Social Learning**: Discussion threads, peer comments, cohort chat
- **Live Quizzes**: Kahoot-style assessments with real-time rankings
- **Session Analytics**: AI-assisted engagement analysis for facilitators and admins

## 🏗️ Architecture

### Tech Stack

**Frontend**
- Next.js 16 (App Router) + `src/proxy.ts` route protection
- TypeScript
- TanStack Query (data fetching)
- Zustand (state management)
- Tailwind CSS + Shadcn UI
- Radix UI components
- API calls default to same-origin `/api/proxy` with HttpOnly auth cookies (see `frontend/src/app/api/`)

**Backend**
- NestJS (TypeScript)
- PostgreSQL (primary database)
- Prisma ORM
- JWT authentication + RBAC
- Google Gemini for session analytics, discussion scoring, and admin AI helpers

**AI Services** (`ai-services/`)
- **Planned / documentation only** in this repository — there is no Python service implementation here yet. In-app AI features use Gemini from the Nest backend.

**Deployment** (see [DEPLOYMENT.md](DEPLOYMENT.md))
- Frontend: Vercel
- Backend: Render (Dockerfile at repository root)
- Database: Neon (or any managed PostgreSQL)

**Other directories**
- `shared/` — TypeScript curriculum data consumed by the backend via relative imports (not a published npm package).
- `legacy/` — Older stack kept for reference only; it is not the active application.

## 🎓 Program Structure

- **Duration**: 4 months (April - July 2026)
- **Sessions**: 16 Saturday sessions (2:00 PM - 4:30 PM)
- **Resources**: 91 curated articles and videos
- **Roles**: Fellow (learner), Facilitator (session leader), Admin (system operator)

### Monthly Themes
1. **Month 1**: Foundations for Professional Excellence
2. **Month 2**: Career Clarity & Modern Work Skills
3. **Month 3**: Visibility, Opportunity & Career Growth
4. **Month 4**: Sustainability, Innovation & Future Readiness

## ✨ Key Features

### For Fellows (Learners)
- **Smart Resource Unlocking**: Resources become available 8 days before each session
- **Progress Tracking**: Monitor completion status, time spent, and learning milestones
- **Gamification**: Earn points for deep engagement (30 pts core, 15 pts optional)
- **Real-time Leaderboards**: Monthly rankings with historical access
- **Achievements & Badges**: Consistency Star, Deep Diver, Discussion Leader, Quiz Master
- **Social Learning**: Discussion threads with mandatory participation, peer comments
- **Live Quizzes**: Time-bound Kahoot-style assessments with bonus multipliers
- **Cohort Chat**: Global and session-specific channels for collaboration

### For Facilitators
- **Early Access**: Preview session resources before they unlock
- **Engagement Analytics**: View anonymized participation trends and drop-off points
- **Session Insights**: AI-powered analysis of live session engagement

### For Admins
- **Cohort Management**: Create cohorts, schedule sessions, assign facilitators
- **Resource Control**: Upload content, configure unlock dates, manage resource states
- **Quiz Creation**: Build assessments with custom multipliers and time windows
- **Manual Scoring**: Award/adjust points, allocate session engagement scores
- **Anti-Gaming Tools**: Flag suspicious behavior, reduce points for skimming
- **Analytics Dashboard**: Track cohort health, completion rates, participation patterns
- **Audit Logs**: Full transparency on all admin actions

## 🎮 Gamification System

### Points Structure
- **Core Resources**: 30 points (must meet 80% scroll/85% watch + 70% time threshold)
- **Optional Resources**: 15 points (same thresholds)
- **Discussion Posts**: 20 points (≥100 words, original)
- **Discussion Replies**: 10 points (max 3 per resource)
- **Quizzes**: 10 points per correct answer + time bonus
- **Session Engagement**: 10-30 points (admin/AI-scored)
- **Chat Participation**: 2-5 points (daily cap: 10 points)

### Achievements
- **Consistency Star** (50 pts): Complete all core resources in a month
- **Deep Diver** (30 pts): Complete all optional resources in a month
- **Discussion Leader** (40 pts): 5+ quality discussions in a month
- **Quiz Master** (25 pts): Top 3 in a live quiz
- **Monthly Champion** (100 pts): #1 on leaderboard

### Anti-Skimming Protection
- Minimum time requirements (70% of estimated duration)
- Scroll depth tracking for articles (≥80%)
- Watch completion tracking for videos (≥85%)
- Abnormal pattern detection (>3 resources <50% time → 50% point reduction)
- Duplicate discussion content flagging

## 📁 Project Structure

```
career-resources-hub/
├── frontend/              # Next.js application (to be built)
│   ├── app/              # App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities, API client
│   ├── hooks/            # Custom React hooks
│   └── stores/           # Zustand state management
├── backend/              # NestJS API (to be built)
│   ├── src/
│   │   ├── auth/         # Authentication module
│   │   ├── users/        # User management
│   │   ├── cohorts/      # Cohort & session management
│   │   ├── resources/    # Resource management & locking
│   │   ├── gamification/ # Points, achievements, leaderboards
│   │   ├── discussions/  # Discussion threads & comments
│   │   ├── quizzes/      # Quiz system
│   │   ├── chat/         # Chat system
│   │   ├── analytics/    # Event tracking & analytics
│   │   └── admin/        # Admin tools
│   └── prisma/           # Database schema & migrations
├── ai-services/          # Python microservices (to be built)
│   ├── session-analyzer/ # Session engagement analysis
│   ├── discussion-quality/ # Discussion quality evaluator
│   └── skimming-detector/ # Pattern detection
├── shared/               # Shared TypeScript types (to be built)
├── docs/                 # Platform documentation
│   ├── atlas.md          # Core concept document
│   ├── prd.md            # Product requirements
│   ├── curriculum.md     # Fellowship curriculum
│   └── *.md              # Technical specifications
└── legacy/               # Original simple website (archived)
```

## 📋 Prerequisites

### Development Environment
- **Node.js**: v18 or higher (v20 recommended for Docker parity)
- **pnpm**: v8 or higher (monorepo installs)
- **PostgreSQL**: v14 or higher (see [docker-compose.yml](docker-compose.yml) — host port **5433**)

### Required Services
- PostgreSQL database
- `GEMINI_API_KEY` (optional but required for AI-backed features in Nest)

## 🛠️ Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/cekwedike/lunchpad-atlas.git
cd lunchpad-atlas
```

### 2. Set Up Environment Variables

Copy [backend/.env.example](backend/.env.example) to `backend/.env` and adjust URLs. Prisma requires both `DATABASE_URL` and `DIRECT_URL` (see example file).

**Frontend** — copy [frontend/.env.example](frontend/.env.example) to `frontend/.env.local`. Use the **same** `JWT_SECRET` as the backend so `src/proxy.ts` can verify session cookies.

### 3. Database Setup
```bash
# From repo root — Postgres on localhost:5433 (see docker-compose.yml)
docker compose up -d

# Run database migrations (from /backend)
cd backend
pnpm prisma migrate dev
pnpm prisma db seed  # Load curriculum data
```

### 4. Install Dependencies

**Backend**
```bash
cd backend
pnpm install
```

**Frontend**
```bash
cd frontend
pnpm install
```

### 5. Run Development Servers

**Terminal 1: Backend API**
```bash
cd backend
pnpm start:dev  # Runs on http://localhost:4000
```

**Terminal 2: Frontend**
```bash
cd frontend
pnpm dev  # Runs on http://localhost:3000
```

### 6. Access the Platform
- **Fellow Dashboard**: http://localhost:3000/dashboard/fellow
- **Admin Dashboard**: http://localhost:3000/dashboard/admin
- **Facilitator Dashboard**: http://localhost:3000/dashboard/facilitator
- **API Documentation**: http://localhost:4000/api/docs

## 🚀 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel + Render + Neon. The production Docker image is built from the **repository root** [Dockerfile](Dockerfile) (`docker compose` / Render `dockerContext: .`).

### Package managers
- **Local monorepo**: pnpm workspaces (`frontend`, `backend`).
- **Docker image**: `npm ci` with [backend/package-lock.json](backend/package-lock.json) for reproducible production installs.

### Database
- **Production PostgreSQL**: AWS RDS, Neon, or Supabase
- **Production Redis**: Upstash or Redis Cloud

## 📊 Database Schema

The platform uses PostgreSQL with 14+ tables:
- `users` - User accounts with role-based access
- `cohorts` - Fellowship cohorts with state management
- `sessions` - Saturday learning sessions
- `resources` - Articles/videos with unlock logic
- `resource_progress` - Engagement tracking per user
- `discussions` & `discussion_comments` - Social learning
- `points_log` - Immutable point transaction history
- `achievements` & `user_achievements` - Badge system
- `monthly_leaderboards` & `leaderboard_entries` - Rankings
- `quizzes`, `quiz_questions`, `quiz_responses` - Assessment system
- `engagement_events` - Complete event stream for analytics
- `session_analytics` - AI-generated session insights
- `admin_audit_logs` - Full audit trail

See [docs/launch_pad_platform_data_model_database_schema.md](docs/launch_pad_platform_data_model_database_schema.md) for complete schema.

## 📚 Documentation

- **[ATLAS Core Concept](docs/atlas.md)** - Platform vision and key features
- **[Product Requirements](docs/prd.md)** - Complete feature specifications
- **[System Architecture](docs/launch_pad_platform_system_architecture_tech_stack.md)** - Technical design
- **[Database Schema](docs/launch_pad_platform_data_model_database_schema.md)** - Data model
- **[Gamification Rules](docs/launch_pad_platform_gamification_scoring_rules.md)** - Points and achievements
- **[User Journeys](docs/launch_pad_platform_user_journeys_state_flows.md)** - Role-based flows
- **[API Specification](docs/launch_pad_platform_api_specification.md)** - Endpoint contracts
- **[Roles & Permissions](docs/launch_pad_platform_roles_permissions.md)** - Access control
- **[Analytics & AI](docs/launch_pad_platform_analytics_ai_behavior.md)** - Event tracking and AI
- **[Non-Functional Requirements](docs/launch_pad_platform_non_functional_requirements.md)** - Performance, security
- **[Curriculum](docs/curriculum.md)** - Fellowship program structure

## 🧪 Testing

```bash
# Backend unit tests
cd backend
pnpm test

# Backend e2e tests
pnpm test:e2e

# Frontend component tests
cd frontend
pnpm test

# End-to-end tests
pnpm test:e2e
```

## 🤝 Contributing

This is a private project for the THRiVE Hub LaunchPad Fellowship. For questions or support, contact the THRiVE Hub team.

## 📄 License

Proprietary - THRiVE Hub © 2026

## 🔗 Resources

- **THRiVE Hub**: [thrivehub.africa](https://thrivehub.africa)
- **LaunchPad Fellowship**: More information about the program
- **Platform Status**: Coming April 2026

## 🛡️ Security & Privacy

- All passwords hashed with bcrypt
- JWT authentication with refresh tokens
- Role-based access control (RBAC) enforced server-side
- HTTPS enforced in production
- Audit logs for all admin actions
- No biometric or sentiment profiling
- Fellows can view their own engagement data

## 🎯 Current Status

**Phase**: Platform Development  
**Launch Date**: April 11, 2026 (Cohort 4 Start)  
**Current Version**: 2.0.0-alpha (Complete rebuild)

### Development Roadmap
- ✅ Complete documentation and requirements
- ✅ GitHub repository setup
- 🚧 Monorepo structure creation
- 🚧 Backend API development
- 🚧 Frontend dashboard development
- 🚧 AI services integration
- ⏳ Testing & QA
- ⏳ Production deployment
- ⏳ Cohort 4 onboarding

---

**Built with ❤️ for the next generation of African talent**
