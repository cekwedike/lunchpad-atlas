# LaunchPad Fellowship Platform
## Gamification & Scoring Rules Specification

---

## 1. Purpose of This Document

This document defines the **complete gamification system** for the LaunchPad Fellowship platform. It specifies:
- Point logic and formulas
- Monthly leaderboard mechanics
- Achievement rules
- Anti-gaming safeguards

It is written to be **machine-readable in intent**, safe for AI-assisted development, and enforceable without human ambiguity.

---

## 2. Gamification Design Principles

- **Learning-first**: Points reward depth, not speed
- **Monthly fairness**: Everyone resets monthly
- **Effort-weighted**: Optional depth is rewarded but not mandatory
- **Anti-exploit**: Skimming and spam are penalized
- **Explainable**: Admins can always see why points were awarded
- **Cohort-aware**: Point caps and achievement thresholds scale with cohort duration

---

## 3. Points System Overview

### 3.1 Point Sources

| Source | Description |
|------|------------|
| Resource Completion | Articles & videos (core and optional) |
| Discussion Engagement | Posts and comment replies |
| Quiz Performance | Timed quizzes with accuracy and speed bonuses |
| Chat Engagement | Chat message bonuses and streak bonuses |
| Achievements | Milestones across multiple categories |
| Admin/Facilitator Adjustments | Manual point overrides |

All points are recorded in `PointsLog` and are immutable.

### 3.2 Monthly Point Cap (Cohort-Duration-Aware)

The monthly point-earning cap scales based on cohort duration:

| Cohort Duration | Monthly Cap | Total Target |
|----------------|-------------|-------------|
| 1 month | 10,000/mo | 10,000 |
| 2 months | 11,000/mo | 22,000 |
| 3 months | 15,000/mo | 45,000 |
| 4 months | 20,000/mo | 80,000 |
| 5 months | 24,000/mo | 120,000 |
| 6+ months | 26,667/mo | 160,000 |

The cap is set on user registration (based on assigned cohort) and updated when a user's cohort changes.

---

## 4. Resource-Based Points

### 4.1 Core Resources

Base points: **100 points**

Requirements (anti-skimming validation):
- Articles: >= 80% scroll depth
- Videos: >= 85% watch completion
- All types: minimum time spent >= 70% of estimated duration
- Failure to meet thresholds = completion blocked (ForbiddenException)

### 4.2 Optional (Deep-Dive) Resources

Base points: **50 points**

Same engagement thresholds apply.

### 4.3 Engagement Quality Bonus

Up to **20% extra points** based on engagement quality score (0.0-1.0):
- `qualityBonus = floor(pointValue * engagementQuality * 0.2)`
- Example: 100-point resource with 0.8 quality = +16 bonus points

### 4.4 Timeliness Bonus

Bonus for completing resources promptly after they unlock:
- Within **3 days** of session unlock date: **+10%** of base points
- Within **4 days** of session unlock date: **+5%** of base points
- After 4 days: no timeliness bonus

### 4.5 Anti-Skimming Penalties

If a user is identified as a repeat skimmer (multiple resources with insufficient engagement):
- All future resource points reduced by **50%** until behavior improves
- Applied after quality bonus and timeliness bonus calculations

---

## 5. Discussion & Social Engagement Points

### 5.1 Discussion Post Submission

- Points: **5 points** per approved discussion post
- Must be >= **100 words** (HTML stripped, then word-counted)
- Points withheld until the user has made at least one comment on another user's discussion (peer engagement requirement)
- Retroactively awarded once peer engagement is demonstrated

### 5.2 Commenting on Discussions

- Points: **2 points** per comment reply
- Maximum **3 point-earning comments per resource** (still allows posting beyond 3, just no additional points)
- Comments on general/session discussions (no linked resource) always earn points

### 5.3 Chat Engagement

Chat bonuses are calculated in the leaderboard system:
- Message count bonuses based on total chat messages in the period
- Chat streak bonuses for consecutive days of chat participation

---

## 6. Quiz-Based Points

### 6.1 Base Scoring

- Base points per quiz (set by admin, typically 50-100)
- Accuracy bonus based on percentage of correct answers
- Speed bonus for fast completion

### 6.2 Live Quizzes

- Real-time quiz sessions managed by facilitators/admins
- Leaderboard visible during quiz
- Points awarded immediately upon submission

---

## 7. Achievements System

### 7.1 Achievement Types

| Type | Description |
|------|------------|
| STREAK | Consecutive days of activity |
| COMPLETION | Resource completion milestones |
| QUIZ | Quiz performance milestones |
| ENGAGEMENT | Overall engagement metrics |
| DISCUSSION | Discussion participation milestones |
| LEADERBOARD | Total points milestones (scaled by cohort duration) |

### 7.2 LEADERBOARD Achievement Thresholds

Thresholds scale as a percentage of the cohort's total point target:

| Achievement | % of Total Target | 4-Month Example |
|------------|-------------------|-----------------|
| Point Starter | 0.5% | ~400 pts |
| Point Collector | 3.125% | ~2,500 pts |
| Point Accumulator | 7.5% | ~6,000 pts |
| Point Hoarder | 15% | ~12,000 pts |
| Point Enthusiast | 25% | ~20,000 pts |
| Point Expert | 40% | ~32,000 pts |
| Point Legend | 55% | ~44,000 pts |
| Point Elite | 72.5% | ~58,000 pts |
| Living Legend | 85% | ~68,000 pts |
| The GOAT | 95% | ~76,000 pts |

### 7.3 Achievement Reset on Cohort Change

When a user is moved to a different cohort:
- All `UserAchievement` records are deleted
- `currentMonthPoints` is reset to 0
- `monthlyPointsCap` is updated to match new cohort duration
- Achievements can be re-earned in the new cohort

### 7.4 Achievement Points

Each achievement awards bonus points (defined in the achievement definition). Achievements are checked and awarded automatically after point-earning actions.

---

## 8. Leaderboard Mechanics

### 8.1 Monthly Periods

- Leaderboard calculated per calendar month
- Points aggregated from `PointsLog` within the month's date range
- Historical months remain viewable via month/year selection

### 8.2 Ranking Calculation

Total score = Base Points + Chat Bonus + Activity Streak Bonus

Where:
- **Base Points**: Sum of all `PointsLog` entries in the period
- **Chat Bonus**: Message count bonus + chat streak bonus
- **Activity Streak Bonus**: Based on consecutive days with any activity (resources, quizzes, discussions, chat)

### 8.3 Tie Breaking

Ties broken by base points (higher base points ranks higher).

### 8.4 Activity Streak

Calculated from unique activity days across:
- Points log events (resource completions, quiz submissions, discussion posts)
- Chat messages
- Discussion comments

---

## 9. Anti-Gaming & Fair Use Rules

- Monthly point cap enforced per user (based on cohort duration)
- Anti-skimming validation on resource completion (scroll depth, watch percentage, time spent)
- Repeat skimmer detection with 50% point penalty
- Discussion 100-word minimum with HTML stripping
- Comment point cap (3 per resource) to prevent point farming
- Peer engagement requirement for discussion post points
- Admin suspension powers (isSuspended flag)

Violations may result in:
- Point reduction (anti-skimming penalty)
- Point cap enforcement (monthly limit)
- Account suspension (admin action)

---

## 10. Admin & Facilitator Controls

### Admins can:
- Award or deduct points for any user
- Create/manage achievements
- Manage all cohorts, sessions, and resources
- Suspend users
- View all analytics and audit logs

### Facilitators can:
- Adjust points for fellows **in their own cohort only**
- Manage resources and discussions in their cohort
- Unlock resources manually for fellows
- View cohort-scoped analytics

All admin/facilitator actions are logged in `AdminAuditLog`.

---

## 11. Point Event Types

| Event Type | Description |
|-----------|------------|
| RESOURCE_COMPLETE | Resource completion with quality/timeliness bonuses |
| QUIZ_SUBMIT | Quiz completion with accuracy/speed bonuses |
| DISCUSSION_POST | Discussion creation (5 pts, peer engagement required) |
| DISCUSSION_COMMENT | Discussion reply (2 pts, 3 per resource cap) |
| ADMIN_ADJUSTMENT | Manual point adjustment by admin/facilitator |
| ACHIEVEMENT_UNLOCK | Points awarded for unlocking an achievement |
