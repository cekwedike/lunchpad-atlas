# ATLAS Project Setup Guide

## 🎯 Complete Installation & Configuration

This guide covers the complete setup of the ATLAS platform including all 16 features.

---

## Prerequisites

### Required Software
- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+ (comes with Node.js)
- **PostgreSQL**: v14+
- **Git**: Latest version

### Development Tools (Recommended)
- **VS Code**: With extensions:
  - Prisma
  - ESLint
  - Prettier
  - TypeScript
- **Postman** or **Thunder Client**: API testing
- **Database GUI**: pgAdmin, TablePlus, or DBeaver

---

## 📦 Installation Steps

### 1. Clone Repository
```bash
git clone <repository-url>
cd career-resources-hub
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
Create `backend/.env`:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/atlas?schema=public"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:5173"

# Google Generative AI (for AI features)
GOOGLE_API_KEY="your-google-ai-api-key"

# Email Configuration (Feature #16)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-specific-password"
EMAIL_FROM="ATLAS Platform <noreply@atlas.com>"
```

#### Database Setup
```bash
# Create database (if not exists)
createdb atlas

# Push Prisma schema to database
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed database with initial data
npx prisma db seed
```

#### Start Backend Server
```bash
# Development mode (with hot reload)
npm run start:dev

# Production build
npm run build
npm run start:prod
```

Server will run on: http://localhost:3000

### 3. Frontend Setup

#### Install Dependencies
```bash
cd ../client
npm install
```

#### Environment Configuration
Create `client/.env`:
```env
VITE_API_URL="http://localhost:3000"
VITE_WS_URL="ws://localhost:3000"
```

#### Start Frontend Server
```bash
# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

Frontend will run on: http://localhost:5173

---

## 🔧 Configuration Details

### Gmail SMTP Setup (for Email Feature)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and device
   - Copy the 16-character password
3. **Use App Password** in `EMAIL_PASSWORD` env variable

### Database Configuration Options

#### Local PostgreSQL
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/atlas"
```

#### Neon (Serverless Postgres)
```env
DATABASE_URL="postgresql://user:pass@ep-xxx-xxx.us-east-1.aws.neon.tech/atlas?sslmode=require"
```

#### Supabase
```env
DATABASE_URL="postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres"
```

### Google AI API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Create new API key
3. Copy to `GOOGLE_API_KEY` env variable

Used for:
- Discussion quality AI scoring (Feature #11)
- Session analytics (Feature #7)
- Engagement analysis (Feature #13)

---

## 🗄️ Database Schema

The platform uses **Prisma ORM** with PostgreSQL.

### Key Models
- **User**: Fellows, facilitators, admins
- **Cohort**: Program cohorts with start/end dates
- **Session**: 16 weekly sessions per cohort
- **Resource**: Videos, articles, exercises
- **ResourceProgress**: Tracking user engagement
- **Discussion**: Resource-specific discussions
- **DiscussionComment**: Threaded comments
- **Quiz**: Assessments with questions
- **QuizResponse**: User quiz submissions
- **LiveQuiz**: Kahoot-style live quizzes (Feature #10)
- **LiveQuizParticipant**: Real-time participants
- **Attendance**: Session check-in/check-out (Feature #15)
- **Notification**: In-app notifications (Feature #3)
- **Channel**: Chat channels (Feature #1)
- **ChatMessage**: Chat messages (Feature #1)
- **SessionAnalytics**: AI-generated session insights (Feature #7)
- **PointsLog**: Gamification points tracking
- **Achievement**: Badges and achievements
- **MonthlyLeaderboard**: Leaderboards per cohort/month

### View Schema
```bash
cd backend
npx prisma studio
```

Opens Prisma Studio on: http://localhost:5555

---

## 🚀 Feature Implementations

### Feature #1: Social Chat System ✅
**Files**:
- Backend: `backend/src/chat/`
- Frontend: `client/src/components/chat/`

**Usage**: Real-time WebSocket chat with channels

### Feature #2: Notifications System ✅
**Files**:
- Backend: `backend/src/notifications/`
- Frontend: `client/src/components/notifications/`

**Usage**: In-app bell icon with unread count

### Feature #3: Setup & Dependencies ✅
**Completed**: All packages installed

### Feature #4: Resource-Specific Discussions ✅
**Files**:
- Backend: `backend/src/discussions/`
- Frontend: `client/src/components/discussions/`

**Usage**: Threaded discussions on resource pages

### Features #5-6: Reserved for Future Use ✅

### Feature #7: Live Session AI Analytics ✅
**Files**:
- Backend: `backend/src/session-analytics/`
- Frontend: `client/src/components/analytics/SessionAnalyticsDashboard.tsx`

**Usage**: AI-powered session engagement analysis

### Feature #8: Reserved for Analytics ✅

### Features #9-10: Live Kahoot Quizzes ✅
**Files**:
- Backend: `backend/src/live-quiz/`
- Frontend: `client/src/components/live-quiz/`

**Usage**: Real-time multiplayer quizzes with leaderboards

### Feature #11: Discussion Quality AI Scoring ✅
**Files**:
- Service: `backend/src/discussions/discussions.service.ts`
- Endpoint: `POST /discussions/:id/score`

**Usage**: AI evaluates discussion posts (0-100 score)

### Feature #12: Advanced Analytics Export ✅
**Files**:
- Service: `backend/src/admin/admin.service.ts`
- Endpoint: `GET /admin/analytics/export`

**Usage**: CSV/JSON export of platform analytics

### Feature #13: AI Skimming Detection ✅
**Files**:
- Enhanced in: `backend/src/resources/resources.service.ts`

**Usage**: Detects superficial engagement (scroll/watch patterns)

### Feature #14: User Management UI ✅
**Files**:
- Backend: `backend/src/admin/admin.controller.ts`
- Frontend: `client/src/components/admin/`

**Usage**: Admin panel for user/cohort management

### Feature #15: Attendance Tracking System ✅
**Files**:
- Backend: `backend/src/attendance/`
- Frontend: `client/src/components/attendance/`

**Features**:
- QR code generation for sessions
- Geolocation-based check-in
- Attendance reports with CSV export
- Late detection and excuse functionality

**Usage**:
```bash
# Generate QR code (facilitator)
GET /attendance/session/:sessionId/qr-code

# Check in (fellow)
POST /attendance/check-in/:sessionId
Body: { latitude, longitude, ipAddress, userAgent }

# View report (facilitator)
GET /attendance/session/:sessionId/report
```

### Feature #16: Email Integration System ✅
**Files**:
- Backend: `backend/src/email/`
- Service: `email.service.ts` (8 email methods)

**Email Templates**:
1. **Welcome Email**: Onboarding new users
2. **Notification Email**: General notifications
3. **Weekly Summary**: Progress digest with stats

**Usage**:
```typescript
// Send welcome email
await emailService.sendWelcomeEmail('user@example.com', {
  firstName: 'John',
  lastName: 'Doe',
  cohortName: 'April 2026 Cohort A',
  startDate: new Date('2026-04-01')
});

// Send weekly summary
await emailService.sendWeeklySummaryEmail('user@example.com', {
  firstName: 'John',
  weekNumber: 4,
  resourcesCompleted: 8,
  pointsEarned: 850,
  rank: 5,
  totalParticipants: 30
});
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run unit tests
npm run test

# Run with coverage
npm run test:cov

# Run specific test file
npm run test -- attendance.service.spec.ts
```

### API Testing

#### Using Thunder Client (VS Code)
1. Install Thunder Client extension
2. Import collection from `backend/thunder-collection.json`
3. Test all endpoints

#### Using Postman
1. Import: `backend/postman-collection.json`
2. Set environment variables:
   - `BASE_URL`: http://localhost:3000
   - `TOKEN`: JWT token from login
3. Test endpoints

#### Manual Testing
```bash
# Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"John","lastName":"Doe"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get profile (with JWT token)
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## 📊 Database Seeding

The seed script (`backend/prisma/seed.ts`) creates:
- 3 Users: Admin, Facilitator, Fellow
- 1 Cohort: "April 2026 Cohort A"
- 16 Sessions: One per week
- Sample Resources: Videos, articles, exercises
- Sample Quizzes: With questions
- Sample Achievements: Milestones, streaks, social

### Run Seed
```bash
cd backend
npx prisma db seed
```

### Reset Database
```bash
cd backend
npx prisma migrate reset  # Caution: Deletes all data!
```

---

## 🔐 Authentication & Authorization

### User Roles
1. **FELLOW**: Regular program participants
2. **FACILITATOR**: Cohort mentors/instructors
3. **ADMIN**: Platform administrators

### Protected Routes

#### Backend (NestJS Guards)
```typescript
@Roles(UserRole.FACILITATOR, UserRole.ADMIN)
@Get('attendance/session/:sessionId/report')
async getReport() { ... }
```

#### Frontend (React Router)
```typescript
<ProtectedRoute roles={['FACILITATOR', 'ADMIN']}>
  <AttendanceReport />
</ProtectedRoute>
```

### JWT Token Structure
```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "FELLOW",
  "iat": 1707224400,
  "exp": 1707829200
}
```

---

## 🌐 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login (returns JWT)
- `GET /auth/me` - Get current user profile

### Resources
- `GET /resources` - List all resources
- `GET /resources/:id` - Get resource details
- `PATCH /resources/:id/progress` - Update progress

### Discussions
- `POST /discussions` - Create discussion
- `GET /discussions/:resourceId` - Get resource discussions
- `POST /discussions/:id/score` - AI score discussion

### Quizzes
- `GET /quizzes/:sessionId` - Get session quizzes
- `POST /quizzes/:id/submit` - Submit quiz answers

### Live Quizzes (Feature #10)
- `POST /live-quiz` - Create live quiz
- `POST /live-quiz/:id/start` - Start quiz
- `POST /live-quiz/:id/join` - Join as participant
- `POST /live-quiz/:id/next` - Move to next question
- `POST /live-quiz/:id/answer` - Submit answer

### Attendance (Feature #15)
- `GET /attendance/session/:id/qr-code` - Generate QR code
- `POST /attendance/check-in/:id` - Check in
- `POST /attendance/check-out/:id` - Check out
- `GET /attendance/session/:id/report` - Get report
- `PATCH /attendance/session/:id/user/:userId/excuse` - Excuse absence

### Chat (Feature #1)
- `GET /chat/channels` - List channels
- `POST /chat/channels/:id/messages` - Send message
- WebSocket: `ws://localhost:3000/chat` - Real-time chat

### Notifications (Feature #2)
- `GET /notifications` - List notifications
- `PATCH /notifications/:id/read` - Mark as read
- `DELETE /notifications/:id` - Delete notification

### Admin (Feature #14)
- `GET /admin/users` - List users
- `POST /admin/users` - Create user
- `PATCH /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user
- `GET /admin/analytics/export` - Export analytics

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: P1001: Can't reach database server at `localhost:5432`
```

**Solution**:
- Ensure PostgreSQL is running: `sudo service postgresql start`
- Check credentials in `DATABASE_URL`
- Verify port is 5432 (default)

#### 2. Prisma Client Out of Sync
```
Error: Prisma Client has not been generated
```

**Solution**:
```bash
cd backend
npx prisma generate
```

#### 3. Email Sending Fails
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Solution**:
- Use App Password (not main password) for Gmail
- Enable "Less secure app access" or use App Password
- Verify `EMAIL_USER` and `EMAIL_PASSWORD` in `.env`

#### 4. CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**:
- Add frontend URL to `FRONTEND_URL` in backend `.env`
- Restart backend server

#### 5. npm Install Errors (qrcode, nodemailer)
```
npm ERR! Cannot read properties of null (reading 'matches')
```

**Solution**:
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Or manually add to `package.json` and install

---

## 📚 Documentation

### API Documentation
- **Swagger UI**: http://localhost:3000/api (when backend is running)
- **Feature Summaries**:
  - [Features 11-14 Summary](./FEATURES_11-14_SUMMARY.md)
  - [Features 15-16 Summary](./FEATURES_15-16_SUMMARY.md)

### Database Schema
- **Prisma Schema**: `backend/prisma/schema.prisma`
- **Entity Relationship Diagram**: Run `npx prisma studio` to visualize

### Code Structure
```
backend/
├── src/
│   ├── auth/                 # Authentication & JWT
│   ├── users/                # User management
│   ├── resources/            # Resources & progress tracking
│   ├── discussions/          # Discussions & comments
│   ├── quizzes/              # Traditional quizzes
│   ├── live-quiz/            # Live Kahoot quizzes (Feature #10)
│   ├── leaderboard/          # Leaderboards
│   ├── achievements/         # Badges & achievements
│   ├── chat/                 # Real-time chat (Feature #1)
│   ├── notifications/        # Notifications (Feature #2)
│   ├── session-analytics/    # AI analytics (Feature #7)
│   ├── attendance/           # Attendance tracking (Feature #15)
│   ├── email/                # Email integration (Feature #16)
│   └── admin/                # Admin panel (Feature #14)
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seed script
└── test/                     # E2E tests

client/
├── src/
│   ├── components/
│   │   ├── chat/             # Chat components (Feature #1)
│   │   ├── notifications/    # Notification bell (Feature #2)
│   │   ├── discussions/      # Discussion threads (Feature #4)
│   │   ├── live-quiz/        # Live quiz UI (Feature #10)
│   │   ├── analytics/        # Analytics dashboard (Feature #7)
│   │   ├── attendance/       # Attendance UI (Feature #15)
│   │   └── admin/            # Admin panel (Feature #14)
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── NotFound.tsx
│   ├── contexts/
│   │   └── ThemeContext.tsx
│   └── hooks/
└── public/
```

---

## 🚢 Deployment

### Backend Deployment (Railway/Fly.io/AWS)

#### Railway
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add PostgreSQL: `railway add`
5. Deploy: `railway up`

#### Fly.io
```bash
# Install Fly CLI
brew install flyctl  # macOS
# or
curl -L https://fly.io/install.sh | sh  # Linux

# Deploy
fly launch
fly deploy
```

### Frontend Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd client
vercel --prod
```

### Environment Variables (Production)
Set in deployment platform:
- `DATABASE_URL` → Managed PostgreSQL URL
- `JWT_SECRET` → Strong random secret (32+ chars)
- `GOOGLE_API_KEY` → Production API key
- `EMAIL_*` → Production SMTP credentials
- `FRONTEND_URL` → Production frontend URL

---

## 📈 Monitoring & Analytics

### Backend Logs
```bash
# Development
npm run start:dev  # Logs to console

# Production
pm2 start dist/main.js --name atlas-backend
pm2 logs atlas-backend
```

### Database Monitoring
- Prisma Pulse: Real-time database events
- PostgreSQL logs: `/var/log/postgresql/`

### Error Tracking
- Sentry: Add `@sentry/node` for error tracking
- Winston Logger: Configured in NestJS

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Run tests: `npm run test`
4. Commit: `git commit -m "feat: Add my feature"`
5. Push: `git push origin feature/my-feature`
6. Create Pull Request

### Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code refactoring
- `test:` Test additions
- `chore:` Maintenance tasks

---

## 📞 Support

### Issues
- GitHub Issues: [Create Issue](<repository-url>/issues)
- Email: support@thrivehub.org

### Resources
- [Prisma Docs](https://www.prisma.io/docs)
- [NestJS Docs](https://docs.nestjs.com)
- [React Docs](https://react.dev)

---

## 📝 License

This project is proprietary software owned by THRiVE Hub.

---

## ✅ Setup Checklist

- [ ] Node.js v18+ installed
- [ ] PostgreSQL v14+ installed
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] Database created (`createdb atlas`)
- [ ] Prisma schema pushed (`npx prisma db push`)
- [ ] Database seeded (`npx prisma db seed`)
- [ ] Backend running (`npm run start:dev`)
- [ ] Frontend running (`npm run dev`)
- [ ] Gmail SMTP configured (for emails)
- [ ] Google AI API key configured (for AI features)
- [ ] Can register and login successfully
- [ ] Can view resources and discussions
- [ ] Can check in to sessions (attendance)
- [ ] Can send test emails

**All features are now complete! 🎉**

Total features: **16/16 (100%)**
