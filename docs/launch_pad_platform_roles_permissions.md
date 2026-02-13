# LaunchPad Fellowship Platform
## User Roles, Permissions & Access Control Specification

---

## 1. Purpose of This Document

This document defines **exact access rights, permissions, and boundaries** for every user role on the LaunchPad Fellowship platform. It ensures:
- Security by design
- Clear separation of responsibilities
- Predictable UI and API behavior
- Safe AI-assisted development without privilege ambiguity

This document works in conjunction with the PRD, Data Model, and API Specification.

---

## 2. Role Overview

There are **three system roles**:

1. Fellow (Primary learner)
2. Facilitator (Session contributor)
3. Admin (System operator)

Roles are **mutually exclusive** per user.

---

## 3. Fellow Permissions

### 3.1 Core Capabilities

Fellows can:
- Log in and manage their profile
- View cohort schedule and sessions
- Access unlocked learning resources
- Track their own progress
- Participate in discussions
- Participate in social chat
- Take quizzes when active
- View leaderboards and achievements

---

### 3.2 Resource Access Rules

Fellows:
- Can only view resources once unlocked
- Cannot access future locked resources
- Cannot modify or delete resources
- Cannot bypass engagement requirements

---

### 3.3 Gamification Visibility

Fellows can:
- See their own point breakdown
- See leaderboard rankings
- See achievement definitions

Fellows cannot:
- See raw analytics of other users
- See admin flags or penalties

---

### 3.4 Restricted Actions

Fellows cannot:
- Create or edit sessions
- Upload transcripts or analytics
- Modify quiz timing or multipliers
- Award or deduct points manually

---

## 4. Facilitator Permissions

### 4.1 Core Capabilities

Facilitators can:
- Access sessions and resources for their assigned cohort(s) only
- Create, edit, and delete sessions within their cohort
- Create, edit, and delete resources for their cohort's sessions
- Unlock or lock resources for fellows (override resource state)
- Create, edit, delete, and trigger quizzes for their sessions
- Upload session transcripts to trigger AI analytics processing
- View session and cohort analytics (including individual fellow data)
- Manage discussions (e.g., add topics, moderate)

---

### 4.2 Resource Access Rules

Facilitators:
- Can view, create, and modify resources for sessions in their assigned cohort
- Can change resource state (LOCKED / UNLOCKED) within their cohort
- Cannot access or modify resources in cohorts they are not assigned to

---

### 4.3 Analytics Visibility

Facilitators can:
- View individual fellow engagement: progress %, points earned, quiz averages, discussion count
- See which fellows need attention (inactive or below 50% progress)
- View resource completion rates per resource
- Access session-level AI analytics after transcript upload

Facilitators cannot:
- See admin audit logs
- See admin flags, suspension reasons, or user penalties

---

### 4.4 Restricted Actions

Facilitators cannot:
- Manage users (create, suspend, flag, delete accounts)
- Manage or reassign cohorts
- Award or deduct points manually
- Modify gamification rules or achievement definitions
- Access data for cohorts they are not assigned to

---

## 5. Admin Permissions

### 5.1 Core Capabilities

Admins have full system access.

Admins can:
- Create, edit, and archive cohorts
- Create and schedule sessions
- Upload and manage resources
- Configure unlock rules
- Trigger and manage quizzes
- View all analytics and logs
- Manage users and roles

---

### 5.2 Gamification Control

Admins can:
- Award or deduct points
- Reset monthly leaderboards
- Disable achievements
- Flag or suspend users

All actions are logged.

---

### 5.3 Analytics & AI Control

Admins can:
- Upload session transcripts or videos
- Trigger AI analysis
- Override AI-generated scores
- Allocate session engagement points

---

## 6. Cross-Role Interaction Rules

- Fellows cannot message admins directly (except support)
- Facilitators cannot view private fellow data
- Admin actions never affect historical data without audit

---

## 7. Permission Enforcement Strategy

### 7.1 Backend Enforcement

- JWT includes role claim
- Role guards applied at controller level
- Resource-level checks applied in services

---

### 7.2 Frontend Enforcement

- Role-based routing
- Conditional UI rendering
- Graceful handling of unauthorized states

---

## 8. Audit & Logging

All admin actions are recorded in:
- admin_audit_logs

Fields include:
- actor
- action
- target
- timestamp

---

## 9. Edge Cases & Safety

- Role changes require re-authentication
- Deleted users retain historical data
- Suspended users cannot earn points

---

## 10. Next Document

**User Journeys & State Flow Specification**

This will describe how each role moves through the platform step by step.

