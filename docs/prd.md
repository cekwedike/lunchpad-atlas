# Product Requirements Document (PRD)
## THRiVE LaunchPad Gamified Learning Platform

---

## 1. Product Overview

### 1.1 Product Name (Working)
THRiVE LaunchPad Learning Platform (Gamified LMS)

### 1.2 Product Vision
To build a purpose-designed, gamified learning platform that powers the LaunchPad Fellowship by driving deep engagement, accountability, community interaction, and measurable learning outcomes—without encouraging shallow participation or content skimming.

The platform is not a generic LMS. It is a **learning + engagement intelligence system** designed to reward ownership, curiosity, consistency, and reflection across live sessions and asynchronous learning.

---

## 2. Problem Statement

Historical challenges across previous LaunchPad cohorts include:
- Inconsistent engagement with learning resources
- Skimming or last-minute consumption of materials
- Low accountability for asynchronous learning
- Uneven participation across the fellowship timeline
- Limited visibility into real engagement behaviors
- Minimal peer-to-peer learning outside live sessions

Existing LMS tools do not sufficiently:
- Prevent shallow consumption
- Encourage structured peer interaction
- Reward consistency over time
- Provide actionable engagement analytics

---

## 3. Goals & Success Metrics

### 3.1 Primary Goals
- Increase meaningful engagement with learning resources
- Improve consistency of participation across all months
- Foster peer learning and community
- Reward depth of learning, not speed
- Provide admins with actionable engagement insights

### 3.2 Success Metrics (KPIs)
- % of fellows completing core resources per session
- Average time spent per resource
- Discussion participation rate
- Monthly leaderboard participation rate
- Live-session engagement scores
- Retention rate across 4 months

---

## 4. User Roles & Permissions

### 4.1 User Roles

#### Admin
- Full system access
- Content management
- Scoring & rules management
- Analytics & reporting
- Quiz control
- Role assignment

#### Facilitator
- Early access to assigned session resources
- View discussion prompts
- View aggregated session-level analytics
- No access to cohort-wide admin controls

#### Fellow
- Access to unlocked resources
- Participate in discussions
- Earn points and achievements
- View leaderboard and personal dashboard

---

## 5. Core Features & Functional Requirements

---

## 5.1 Content & Resource Management

### Requirements
- Support for articles, videos, quizzes, and prompts
- Resources are locked by default
- Resources unlock exactly **8 days before the session**
- Once unlocked, resources remain accessible

### Constraints
- Admin-configurable unlock rules
- Facilitator early-access override

---

## 5.2 Anti-Skimming & Engagement Validation

### Requirements
- Track time spent on each resource
- Enforce minimum time thresholds
- Disable video skipping
- Embed reflection questions/checkpoints
- Completion status only valid after engagement criteria met

---

## 5.3 Gamification Engine

### Points System
Points awarded for:
- Core resource completion
- Optional resource completion
- Time-based engagement thresholds
- Discussion participation
- Quiz performance
- Live-session engagement

### Rules
- Monthly point caps
- Admin-configurable weights
- Abuse-prevention logic

---

## 5.4 Leaderboard System

### Requirements
- Real-time leaderboard
- Monthly reset
- Monthly Fellow of the Month
- Tie-breaking logic

---

## 5.5 Achievements & Badges

### Examples
- Core Content Champion
- Deep Diver
- Consistency Star
- Thought Leader
- Top 10 Finisher

---

## 5.6 Social Chat & Community

### Requirements
- Cohort-wide chat
- Monthly theme channels
- Session-specific channels
- Moderation tools

---

## 5.7 Resource-Based Discussions

### Requirements
- Mandatory prompt per resource
- Require posting + commenting
- Quality-weighted scoring

---

## 5.8 Live Quiz System (Kahoot-style)

### Requirements
- Admin-triggered quizzes
- Time-bound windows (10–30 mins)
- Auto-grading
- Real-time ranking
- Point multipliers

---

## 5.9 Live Session Analytics

### Requirements
- Upload video or transcript
- Analyze engagement patterns
- Identify high/low engagement moments
- Allocate live engagement points

---

## 5.10 Dashboards

### Fellow Dashboard
- Progress tracking
- Points & badges
- Leaderboard position
- Upcoming unlocks

### Admin Dashboard
- Engagement analytics
- Resource performance
- Cohort health indicators

---

## 6. Notifications & Nudges

### Requirements
- Resource unlock alerts
- Quiz reminders
- Incomplete core nudges
- Session reminders

---

## 7. Security, Privacy & Data

### Requirements
- Role-based access control
- Secure media storage
- Activity logging
- Data export for admins

---

## 8. Non-Functional Requirements

- Scalable to multiple cohorts
- Mobile-responsive
- High availability
- Low latency for quizzes

---

## 9. MVP vs Phase 2

### MVP
- Resource locking
- Gamification
- Leaderboards
- Discussions
- Dashboards

### Phase 2
- Advanced session analytics
- AI-assisted engagement scoring
- Integrations

---

## 10. Risks & Mitigations

- Over-gamification → Balanced scoring
- Skimming loopholes → Multi-layer validation
- Engagement fatigue → Monthly resets

---

## 11. Open Questions

- Build vs buy decision
- Budget constraints
- Timeline

---

## 12. Conclusion

This platform is designed to be a **core operational backbone** of the LaunchPad Fellowship—elevating learning quality, engagement, and insight beyond traditional LMS systems.

