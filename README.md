# ATLAS

**Accelerating Talent for Leadership & Success**

ATLAS is the official **gamified learning platform** for the **THRiVE Hub LaunchPad Fellowship**—a structured program that prepares young African professionals to compete in the global job market. It is not a generic content library: it is a cohort-based system built to centralize curriculum, enforce meaningful engagement (not just “clicks”), surface participation to facilitators and admins, and make progress visible through points, achievements, and monthly leaderboards.

This repository contains the full-stack application (Next.js frontend, NestJS API, PostgreSQL/Prisma, real-time features). Product vision and extended specs also live under [`docs/`](docs/).

---

## What ATLAS Is For

| Goal | How ATLAS supports it |
|------|------------------------|
| **One place for fellowship learning** | Session-scoped articles and videos, unlock rules, and progress tracking |
| **Depth over speed** | Anti-skimming rules (scroll/watch thresholds), engagement quality scoring, penalties for repeat low-engagement patterns |
| **Accountability & healthy competition** | Monthly leaderboards, cohort-scoped visibility, achievements |
| **Community learning** | Resource and session discussions, comments, cohort chat |
| **Assessment** | Async quizzes (passing score, time bonus, multipliers) and facilitator-run **live** quizzes |
| **Program intelligence** | Engagement events, optional AI-assisted discussion quality scoring, session analytics tooling for staff |

**Design principle (carried through product docs and code):** points reward **meaningful** participation. The system is built to discourage skimming, spam, and point-farming.

---

## Fellowship Context (Typical Cohort)

Figures below match published curriculum and README context for **Cohort 4 (2026)**; always confirm dates with your cohort announcement.

- **Duration:** Four months (e.g. April–July 2026).
- **Live sessions:** Saturdays, **2:00 PM–4:30 PM** (2.5 hours); **16** Saturday sessions in the curriculum design.
- **Curriculum:** Organized by **monthly themes** (e.g. foundations, career clarity, visibility/growth, sustainability/innovation), with storytelling sessions in the plan.
- **Resources:** Curated articles and videos tied to sessions (the codebase and seeds model many resources; exact counts are content-managed).

**Roles on the platform**

- **Fellow** — Learner; earns points and appears on the cohort leaderboard (subject to rules below).
- **Facilitator** — Session/cohort operations: early resource access, cohort-scoped analytics, point adjustments **for their cohort**, manual unlocks where allowed.
- **Admin** — Full cohort, user, content, quiz, and audit capabilities; org-wide visibility.
- **Guest facilitator** — Read-oriented access to assigned sessions (e.g. preview); **does not earn points** for resource completion.

---

## Core Fellow Experience

### Learning resources

- Resources belong to **sessions** (and thus to a **cohort**).
- **Unlocking:** A resource becomes available when `now >= session.unlockDate`. If admins create a session with a **scheduled date** but no explicit unlock date, the backend **defaults unlock to 5 days before** that scheduled date (see `backend` session creation logic). *(Older concept notes sometimes say “8 days”; the **implemented** default is five unless staff set a custom `unlockDate`.)*
- Once unlocked, content typically stays available for the rest of the fellowship for that cohort’s timeline.
- **Completion** is gated by engagement metrics (see **How fellows earn points — resources**).

### Discussions and chat

- **Discussions** can be tied to a resource and/or session; prompts encourage reflection on materials.
- **Comments** on others’ threads are part of the social layer and feed into leaderboard “activity” signals.
- **Cohort chat** supports asynchronous community conversation (counts toward leaderboard bonuses—see below).

### Quizzes

- **Standard quizzes:** Configurable passing score, time limit, point value, optional **multiplier**, and optional **max attempts**. Points are awarded on the **first passing attempt**; retries reduce the multiplier geometrically (half each attempt).
- **MEGA quizzes:** Special type that awards **tiered rank-based points** among passing submissions (see points section).
- **Live quizzes:** Facilitator-driven, real-time sessions; final **rank** determines large tiered point awards (same tier scale as MEGA in code).

### Notifications and digests

- Email and in-app notifications exist for engagement nudges, quizzes, and weekly digest eligibility (see backend `notifications`, `email`, `cron` modules).

---

## How Fellows Get Awarded Points

All point grants are recorded in an **immutable points log** (`PointsLog`). Fellows also have a **monthly point balance** and a **monthly cap**; if an award would exceed the cap, **no points** are granted for that action (completion may still succeed).

### Monthly point cap (cohort-duration-aware)

The **maximum points a fellow can earn per calendar month** depends on **cohort length** (from cohort `startDate` / `endDate`). Implemented caps (see `backend/src/common/gamification.utils.ts`):

| Cohort length | Monthly cap | Approximate total target over cohort |
|---------------|-------------|--------------------------------------|
| 1 month | 10,000 | 10,000 |
| 2 months | 11,000 | 22,000 |
| 3 months | 15,000 | 45,000 |
| 4 months | 20,000 | 80,000 |
| 5 months | 24,000 | 120,000 |
| 6+ months | 26,667 | 160,000 |

The cap is applied when **logging** points (resources, quizzes, discussions, achievements, admin adjustments—each module enforces it consistently).

---

### 1. Resources (articles & videos)

**Base points** come from each resource’s `pointValue`. **Defaults when staff create resources:** **100** for **core**, **50** for **optional** deep-dives (admin API can override).

**To mark a resource complete and receive points, the fellow must:**

1. **Start engagement** so the system tracks progress (no “complete” without a progress record).
2. **Meet type-specific minimums at completion time:**
   - **Articles:** **≥ 80%** scroll depth.
   - **Videos:** **≥ 85%** watch completion.
3. **Engagement quality (0.0–1.0)** is computed from scroll/watch depth and time relative to estimated length; it feeds a **quality bonus** on completion.

**Bonuses and penalties on the base `pointValue`:**

- **Quality bonus:** Up to **+20%** of base: `floor(pointValue × engagementQuality × 0.2)`.
- **Timeliness bonus** (relative to **session unlock date**):  
  - Complete within **3** days of unlock: **+10%** of base (floored).  
  - Within **4** days: **+5%** of base.  
  - After that: **no** timeliness bonus.
- **Anti-skimming penalty:** If the user is classified as a **repeat skimmer** (among the last 10 completed resources, **≥3** completions where time spent was **below half** of the resource’s minimum time threshold), **all resource points are halved** (after quality and timeliness bonuses). A warning notification may be sent.

**Tracked engagement (for quality and skimming detection):**

- Time spent is compared to **70% of estimated duration** for a “minimum threshold met” flag during tracking; engagement quality blends depth and time.
- Video **playback** behavior (speed, pauses, seeks) can reduce engagement quality via the enhanced engagement helper (e.g. very high playback speed reduces quality).

**Guest facilitators** cannot complete resources for points.

---

### 2. Discussions

**Creating a discussion post**

- Content must be at least **100 words** (HTML stripped before counting).
- **5 points** for an approved post **only after** the fellow has **commented on someone else’s discussion** (peer engagement). Until then, points are **withheld**; when the fellow later engages a peer, **earlier withheld posts can be awarded retroactively**.
- Fellows are limited to **5 discussions per resource** and **5 per session** (staff can delete threads to free slots).

**Commenting**

- **2 points** per qualifying reply, **maximum 3 point-earning comments per resource** (additional comments are allowed but earn no points).
- Comments on discussions **not** tied to a resource still earn points (no per-resource cap).

**AI quality score (when enabled/triggered)**

- Discussions (and comments) can be scored **0–100**; the system can log **`DISCUSSION_QUALITY_SCORE` / `COMMENT_QUALITY_SCORE`** events for **up to that many points** per scored item (replacing prior score logs for that item). This is separate from the flat **+5 / +2** discussion points and rewards **thoughtful** writing when staff run scoring.

**Thought Leader achievement:** requires **7** discussions with **quality score ≥ 70** (see achievements list below).

---

### 3. Async quizzes (non-live)

On **first successful pass** (first time passing, not first attempt number):

- **Base:** `quiz.pointValue` if score ≥ `passingScore`, else **0**.
- **Multiplier:** `quiz.multiplier` (default 1) applied to base.
- **Time bonus** (if `timeTaken` is within the quiz time limit):  
  - Finish in **&lt; 50%** of limit: **+20%** of `pointValue` (rounded).  
  - **&lt; 75%** of limit: **+10%** of `pointValue`.
- **Retry penalty:** Attempt *n* multiplies the **total** (base × multiplier + time bonus) by **1 / 2^(n−1)**. **Points are only awarded on the first passing submission**—re-passing does not re-award.

**MEGA quiz:** Passing submissions get **rank-based** points (competition among scores): **3000 / 2000 / 1000 / 500** (ranks 4–7) / **200** (rank 8+), with cap bypass for the award path as implemented.

---

### 4. Live quizzes

When a live quiz **completes**, **final rank** among participants sets **tiered points** (same band as MEGA): **3000, 2000, 1000, 500, 200** by rank. During play, in-room scoring uses question points and **streak bonuses** on correct answers (see `live-quiz` service).

**Quiz Master achievement:** finish **top 3** in a **live** quiz session at least once.

---

### 5. Leaderboard display bonuses (not all in `PointsLog` as separate events)

The **monthly leaderboard** sorts fellows by:

**Total = Base points + Chat bonus + Activity streak bonus**

- **Base points:** Sum of **`PointsLog`** for that **calendar month** (resources, quizzes, discussions, achievements, admin adjustments, live quiz awards, quality scores, etc.).
- **Chat bonus:**  
  - **+30** if **combined** chat messages **+** discussion comments in the month **≥ 50**.  
  - **Plus** a **chat-day streak** bonus using the same tier table as activity streak (see below).
- **Activity streak bonus:** Consecutive **calendar days** (through month end) with **any** activity: points-log events, chat messages, or discussion comments. Tiers: **7→+10, 14→+15, 21→+20, 28→+25** points.

**Tie-break:** Higher **base points** wins.

So: **chat and streak bonuses affect rank** even though they are **not** always mirrored as separate point log lines—plan for leaderboard holistically.

---

### 6. Achievements

Achievements are defined in code and synced to the database on boot (`backend/src/achievements/achievements.service.ts`). Unlocking an achievement grants its **`pointValue`** (subject to monthly cap).

**Examples of criteria:**

- **Milestones:** First resource, N resources completed, N quizzes passed, perfect scores, live quiz participation counts.
- **Social:** Discussion and comment counts; **Social Butterfly** (15 posts + 15 comments); **Thought Leader** (7 AI-scored discussions ≥ 70).
- **Combos:** e.g. **Triple Threat** — 30 resources, 12 quizzes, 12 discussions.
- **Leaderboard / points:** **Point Starter** through **The GOAT** use **total points earned since cohort start**, with thresholds **scaled** by cohort duration (targets in `gamification.utils.ts`). Display names mention example numbers for a **4-month (80k target)** cohort; shorter/longer cohorts scale.
- **Monthly Champion:** **#1** on the monthly leaderboard; **Top 10 Finisher:** rank ≤ 10.
- **Consistency Star:** **100%** of **core** resources for sessions **scheduled in the current calendar month** completed.
- **Deep Diver:** **100%** of **optional** resources in a **session** completed.

Full names, descriptions, and point values are in `ACHIEVEMENT_DEFINITIONS` in the achievements service (60+ entries).

---

### 7. Manual adjustments

- **Admins** can add or subtract points for any user (audit-logged).
- **Facilitators** can adjust points **only for fellows in cohorts they facilitate**.

Use cases: live session participation, corrections, recognition—**subject to the same monthly cap** unless business rules specify otherwise.

---

### 8. Point event types (audit trail)

| Event type | Typical meaning |
|------------|-----------------|
| `RESOURCE_COMPLETE` | Resource completed with bonuses/penalties |
| `QUIZ_SUBMIT` | Async quiz, MEGA quiz, or live quiz completion |
| `DISCUSSION_POST` / discussion comments | Social points |
| `DISCUSSION_QUALITY_SCORE` / `COMMENT_QUALITY_SCORE` | AI quality points |
| `ACHIEVEMENT_UNLOCK` | Achievement bonus |
| `ADMIN_ADJUSTMENT` | Staff change |

---

## Anti-Gaming and Fair Play (Summary)

- Monthly **hard cap** on earnable points.
- Resource completion **requires** demonstrated scroll/watch depth; **repeat skimming** halves resource points.
- Discussion **word minimum**, **peer engagement** rule for post points, **3 comments per resource** cap for comment points.
- **Suspension** and admin tooling can restrict accounts.
- Achievements and leaderboard tiers are **cohort-aware** so multi-month programs stay fair.

---

## Tech Stack (Abbreviated)

| Layer | Stack |
|-------|--------|
| Frontend | Next.js (App Router), TypeScript, TanStack Query, Zustand, Tailwind, shadcn/ui; BFF auth via `frontend/src/app/api/` |
| Backend | NestJS, Prisma, PostgreSQL, JWT + RBAC, WebSockets for chat/quizzes/notifications |
| AI | Google Gemini (backend) for discussion scoring and analytics helpers; `ai-services/` Python folder is **design-only** in-repo |

**Deployment:** See [`DEPLOYMENT.md`](DEPLOYMENT.md) (e.g. Vercel + Render + managed Postgres).

---

## Local Development

### Prerequisites

- **Node.js** 18+ (20 recommended)
- **pnpm** 8+
- **PostgreSQL** 14+ (Docker Compose exposes **5433** on the host—see [`docker-compose.yml`](docker-compose.yml))

### Setup

```bash
git clone https://github.com/cekwedike/lunchpad-atlas.git
cd lunchpad-atlas
```

1. Copy `backend/.env.example` → `backend/.env` (set `DATABASE_URL` and `DIRECT_URL`).
2. Copy `frontend/.env.example` → `frontend/.env.local` (**same `JWT_SECRET`** as backend for cookie verification).

```bash
docker compose up -d
cd backend
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm start:dev   # API e.g. http://localhost:4000

cd ../frontend
pnpm install
pnpm dev         # http://localhost:3000
```

**Useful URLs (local):**

- Fellow dashboard: `http://localhost:3000/dashboard/fellow`
- Admin: `http://localhost:3000/dashboard/admin`
- API docs: `http://localhost:4000/api/docs`

### Testing

```bash
cd backend && pnpm test && pnpm test:e2e
cd ../frontend && pnpm test
```

---

## Further Documentation

| Document | Contents |
|----------|----------|
| [`docs/atlas.md`](docs/atlas.md) | Original concept: vision, features, “Fellow of the Month,” etc. |
| [`docs/launch_pad_platform_gamification_scoring_rules.md`](docs/launch_pad_platform_gamification_scoring_rules.md) | Authoritative scoring spec (align with code for any drift) |
| [`docs/prd.md`](docs/prd.md) | Product requirements |
| [`docs/curriculum.md`](docs/curriculum.md) | Cohort 4 curriculum narrative and session themes |
| [`docs/launch_pad_platform_roles_permissions.md`](docs/launch_pad_platform_roles_permissions.md) | RBAC |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Production deployment |

---

## Security & Privacy (High Level)

Passwords hashed (bcrypt), HTTPS in production, server-side RBAC, audit logs for privileged actions, HttpOnly cookies for session handling on the frontend BFF. See [`docs/SECURITY.md`](docs/SECURITY.md).

---

## License

Proprietary — THRiVE Hub © 2026

---

**THRiVE Hub:** [thrivehub.africa](https://thrivehub.africa)
