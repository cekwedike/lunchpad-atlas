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

---

## 3. Points System Overview

### 3.1 Point Sources

| Source | Description |
|------|------------|
| Resource Completion | Articles & videos |
| Discussion Engagement | Prompts, replies, comments |
| Quiz Performance | Timed quizzes |
| Session Engagement | Live participation |
| Achievements | Milestones |
| Admin Adjustments | Manual overrides |

All points are recorded in `points_log` and are immutable.

---

## 4. Resource-Based Points

### 4.1 Core Resources

Awarded only if **minimum engagement thresholds** are met.

- Article (core): 30 points
- Video (core): 30 points

Requirements:
- ≥ 80% scroll depth (articles)
- ≥ 85% watch completion (videos)
- Minimum time spent ≥ 70% of estimated duration

Failure to meet thresholds = 0 points

---

### 4.2 Optional (Deep-Dive) Resources

- Article (optional): 15 points
- Video (optional): 15 points

Same engagement thresholds apply.

---

### 4.3 Anti-Skimming Penalties

If a user completes >3 resources with:
- <50% time spent OR
- Abnormally fast completion

Then:
- Flag for review
- Future resource points reduced by 50% until reset

---

## 5. Discussion & Social Engagement Points

### 5.1 Discussion Prompt Submission

- Initial response: 20 points
- Must be ≥ 100 words
- Must be original (basic duplication check)

---

### 5.2 Commenting on Others

- Meaningful reply: 10 points
- Max 3 replies per resource

Low-effort replies ("Great post", emojis only) = 0 points

---

### 5.3 Social Chat Engagement

- Quality chat participation: 2–5 points
- Daily cap: 10 points

Admin moderation can nullify spam activity.

---

## 6. Quiz-Based Points

### 6.1 Base Scoring

- Correct answer: 10 points
- Incorrect answer: 0 points

---

### 6.2 Time Bonus

- Top 25% finishers: +10 bonus points
- Middle 50%: +5 bonus points
- Bottom 25%: no bonus

---

### 6.3 Multipliers

Admin-controlled multipliers:
- x1 (default)
- x2
- x3

Applied to total quiz score.

---

## 7. Session Engagement Points

### 7.1 Live Session Participation

Admin or AI-assisted scoring based on:
- Attendance duration
- Chat participation
- Poll responses

Typical range:
- 10–30 points per session

---

## 8. Achievements System

### 8.1 Achievement Types

| Achievement | Condition | Points |
|-----------|----------|--------|
| Consistency Star | 100% core resources in a month | 50 |
| Deep Diver | Completed all optional resources | 30 |
| Discussion Leader | 5 quality discussions | 40 |
| Quiz Master | Top 3 in a quiz | 25 |
| Monthly Champion | #1 leaderboard | 100 |

Achievements are awarded once per month unless stated.

---

## 9. Leaderboard Mechanics

### 9.1 Monthly Reset

- Leaderboard resets at 00:00 UTC on first day of month
- Historical leaderboards remain viewable

---

### 9.2 Ranking Rules

- Sorted by total monthly points
- Ties broken by:
  1. Core resources completed
  2. Quiz performance
  3. Time consistency

---

## 10. Anti-Gaming & Fair Use Rules

- Daily point caps for social/chat activity
- Resource completion cooldowns
- Duplicate discussion detection
- Admin suspension powers

Violations may result in:
- Point nullification
- Temporary point freeze
- Leaderboard exclusion

---

## 11. Admin Controls

Admins can:
- Award or deduct points
- Disable achievements
- Reset user monthly points
- Flag suspicious activity

All admin actions are logged.

---

## 12. Next Document

**User Roles, Permissions & Access Control Specification**

This will define exactly what each role can see and do across the platform.

