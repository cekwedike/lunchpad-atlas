# LaunchPad Fellowship Platform
## System Architecture & Technology Stack Specification

---

## 1. Purpose of This Document

This document defines the **technical architecture, system design, and technology stack** for the LaunchPad Fellowship gamified learning platform. It is written to be:
- Vibecode-ready for AI-assisted development
- Clear enough for human engineers
- Explicit in boundaries to avoid architectural drift

This document assumes the **PRD is already approved** and focuses on *how* the system should be built.

---

## 2. Architecture Principles

### 2.1 Core Principles
- **Modular & scalable**: Each subsystem can evolve independently
- **Analytics-first**: Engagement tracking is foundational, not an afterthought
- **Role-aware by design**: Fellows, facilitators, and admins see different worlds
- **Anti-gaming**: Prevent shallow interaction or leaderboard manipulation
- **AI-augmented, not AI-dependent**: Platform works even if AI features are disabled

### 2.2 Architecture Style

**Modern web-based, service-oriented architecture** with:
- Client-heavy frontend (React)
- API-driven backend
- Event-based analytics pipeline
- AI services as isolated modules

---

## 3. High-Level System Components

### 3.1 Frontend Applications

1. **Fellow Dashboard (Primary App)**
   - Learning resources
   - Progress tracking
   - Leaderboards
   - Social chat
   - Discussions
   - Quizzes
   - Achievements

2. **Admin Dashboard**
   - User management
   - Resource locking rules
   - Analytics & insights
   - Session analysis tools
   - Quiz control
   - Manual overrides

3. **Facilitator Dashboard**
   - Session resources preview
   - Session context
   - Engagement summaries (read-only)


---

## 4. Recommended Technology Stack

### 4.1 Frontend

**Primary Choice: React (Next.js)**

- Framework: **Next.js (App Router)**
- Language: **TypeScript**
- State Management:
  - React Query (server state)
  - Zustand or Redux Toolkit (client state)
- Styling:
  - Tailwind CSS
- UI Components:
  - Radix UI / Shadcn UI

**Why this works well:**
- Excellent for dashboards
- SEO not required but routing & layouts help
- Easy role-based rendering
- Large ecosystem for charts, auth, forms


---

### 4.2 Backend

**Primary Choice: Node.js + NestJS**

- Framework: **NestJS (TypeScript)**
- API Style: REST (with future GraphQL optional)
- Authentication:
  - JWT + refresh tokens
  - Role-based access control (RBAC)

**Why NestJS:**
- Opinionated structure (great for AI-assisted coding)
- Strong typing
- Scales better than ad-hoc Express apps
- Built-in guards, interceptors, modules


---

### 4.3 Database Layer

**Primary Database: PostgreSQL**

- Strong relational modeling
- Excellent for analytics joins
- Supports JSON fields where needed

**Optional Add-ons:**
- Redis (leaderboards, caching, quiz sessions)
- Object storage (videos, transcripts)


---

### 4.4 Analytics & Event Tracking

**Event-Based Analytics Layer**

- Every meaningful user action emits an event:
  - Resource opened
  - Resource completed
  - Time spent
  - Scroll depth
  - Video watch %
  - Quiz participation
  - Chat interaction
  - Discussion replies

Events are:
- Timestamped
- User-scoped
- Resource-scoped
- Session-scoped

Stored in:
- Primary DB (aggregated)
- Optional analytics store (ClickHouse / BigQuery later)


---

### 4.5 AI & Machine Learning Components

**AI is used for analysis, not decision-making**

AI modules:
1. **Session Engagement Analyzer**
   - Inputs: Transcript or video
   - Outputs:
     - Engagement curve
     - Participation density
     - Drop-off points
     - Engagement score

2. **Content Interaction Validator**
   - Detects skimming
   - Flags suspicious completion patterns

3. **Discussion Quality Signals (Optional)**
   - Measures depth, originality, relevance

AI Stack:
- Python microservices
- OpenAI / local LLM abstraction
- Async processing (queue-based)


---

## 5. Resource Locking & Scheduling Engine

### 5.1 Resource Lifecycle

Each resource has:
- Locked
- Unlocked
- Completed
- Expired (optional)

Unlock Rules:
- Automatically unlock **8 days before session date**
- Once unlocked, **never re-lock**


---

## 6. Gamification Engine

### 6.1 Core Responsibilities

- Point calculation
- Achievement assignment
- Monthly leaderboard resets
- Anti-abuse checks


---

## 7. Quiz Engine

- Admin-triggered availability
- Time-boxed windows (10–30 mins)
- Auto-grading
- Real-time ranking
- Bonus multipliers

Uses:
- WebSockets or server polling
- Redis for real-time ranking


---

## 8. Social & Community Layer

Features:
- Global cohort chat
- Resource-level discussion threads
- Reply & comment enforcement rules

Moderation:
- Admin oversight
- Flagging system


---

## 9. Security & Access Control

- JWT-based auth
- Role-based route guards
- Resource-level permissions
- Audit logs for admin actions


---

## 10. Deployment & Infrastructure

Recommended:
- Frontend: Vercel
- Backend: AWS / Fly.io / Railway
- Database: Managed Postgres
- Object Storage: S3-compatible

CI/CD:
- GitHub Actions
- Environment-based configs


---

## 11. Why This Stack Is Optimal

- React + NestJS = Type-safe end-to-end
- Clear separation of concerns
- Scales from MVP to full platform
- Extremely AI-vibecode friendly
- Minimal rework as features grow


---

## 12. Next Document

**Data Model & Database Schema Specification**

This will define every table, field, and relationship required to implement this architecture cleanly.
