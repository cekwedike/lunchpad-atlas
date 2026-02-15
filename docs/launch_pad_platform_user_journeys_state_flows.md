# LaunchPad Fellowship Platform
## User Journeys & State Flow Specification

---

## 1. Purpose of This Document

This document defines **end-to-end user journeys and state transitions** for every role on the LaunchPad Fellowship platform. It ensures:
- Predictable frontend behavior
- Deterministic backend logic
- Clear handling of edge cases
- Safe AI-assisted UI and state management

This document is role-centric and flow-driven.

---

## 2. Global Platform States

### 2.1 Cohort States

- DRAFT → ACTIVE → COMPLETED → ARCHIVED

Effects:
- DRAFT: Cohort is being configured, not yet visible to fellows
- ACTIVE: Resources unlock based on session unlock dates
- COMPLETED: Read-only access, leaderboard archived
- ARCHIVED: Historical record only

---

### 2.2 Resource States

- LOCKED
- UNLOCKED
- IN_PROGRESS
- COMPLETED

Transitions:
- LOCKED → UNLOCKED (date-based)
- UNLOCKED → IN_PROGRESS (first interaction)
- IN_PROGRESS → COMPLETED (threshold met)

---

## 3. Fellow User Journey

### 3.1 Onboarding Flow

1. Receives login credentials
2. Logs in
3. Completes profile
4. Sees cohort dashboard

System checks:
- Cohort must be ACTIVE

---

### 3.2 Learning Flow (Per Session)

1. Views session schedule
2. Sees unlocked resources
3. Opens resource
4. System tracks engagement events
5. Completes resource
6. Receives points
7. Prompted to join discussion

Failure paths:
- Insufficient engagement → no points

---

### 3.3 Discussion Flow

1. Reads discussion prompt or creates a new discussion (100-word minimum)
2. Discussion submitted for approval (facilitator/admin approves)
3. Points withheld until user comments on another user's discussion (peer engagement)
4. Once peer engagement demonstrated, retroactive points awarded for own discussions
5. Comment replies earn 2 points each (max 3 point-earning comments per resource)

---

### 3.4 Quiz Flow

1. Admin activates quiz
2. Fellow receives notification
3. Quiz opens
4. Timer starts
5. Answers submitted
6. Auto-grading
7. Points awarded

Late entry:
- Not allowed after timer starts

---

### 3.5 Leaderboard Flow

1. Fellow views leaderboard
2. Sees rank and points
3. Leaderboard resets monthly
4. Historical leaderboards remain accessible

---

## 4. Facilitator Journey

### 4.1 Session Preparation

1. Assigned to session
2. Receives access to session resources
3. Reviews content and objectives

---

### 4.2 Session Delivery

1. Conducts live session (external tool)
2. Platform records attendance metadata

---

### 4.3 Post-Session Review

1. Views aggregated engagement summary
2. Uploads session transcript for AI analysis
3. Reviews AI-generated insights
4. Can adjust points for fellows in their cohort

Facilitators can:
- Adjust points for fellows in their own cohort
- Unlock resources manually for fellows
- View individual fellow engagement data
- Manage discussions (pin, lock, approve, moderate)

---

## 5. Admin Journey

### 5.1 Cohort Setup

1. Creates cohort
2. Assigns start/end dates
3. Adds users
4. Schedules sessions
5. Uploads resources

---

### 5.2 Session Lifecycle

1. Session scheduled
2. Resources auto-unlock
3. Session delivered
4. Transcript uploaded
5. AI analysis triggered
6. Admin reviews results
7. Engagement points allocated

---

### 5.3 Quiz Management

1. Creates quiz
2. Sets duration and multiplier
3. Toggles quiz active
4. Reviews results

---

### 5.4 Gamification Oversight

1. Reviews leaderboard
2. Flags suspicious behavior
3. Applies overrides

---

## 6. State Transition Rules

### 6.1 Monthly Reset

- currentMonthPoints reset to 0 (via lastPointReset check)
- Leaderboard calculated per calendar month from PointsLog
- Monthly leaderboard archived for historical viewing
- LEADERBOARD achievements use cohort-scoped points (since cohort start date)

### 6.2 Cohort Change Reset

When a user moves to a different cohort:
- All UserAchievement records deleted
- currentMonthPoints reset to 0
- monthlyPointsCap updated to match new cohort duration
- Achievements can be re-earned in new cohort

---

### 6.3 Suspension Flow

- User flagged
- Points frozen
- Admin review
- Reinstate or suspend

---

## 7. Error & Edge Case Handling

- Lost connectivity → resume tracking
- Partial resource completion → IN_PROGRESS
- Duplicate discussion posts → ignored

---

## 8. Notifications & Feedback

- Resource unlocked notifications
- Quiz start alerts
- Achievement awarded notifications
- Discussion reply notifications
- Resource update notifications (admin/facilitator)
- Weekly digest emails (automated via cron)
- Inactivity nudge emails (3+ days inactive, automated via cron)
- Live quiz notifications

---

## 9. Next Document

**Analytics & AI Behavior Specification**

This will define how engagement is measured, analyzed, and scored.
