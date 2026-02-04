# Shared Types - ATLAS Platform

Shared TypeScript types and interfaces used across frontend and backend.

## Purpose

This package contains:
- User roles and permissions
- Resource states and types
- API request/response types
- Event types for analytics
- Gamification types (points, achievements)
- Database entity interfaces

## Usage

```typescript
// Import shared types in frontend
import { UserRole, ResourceState, ResourceType } from '@atlas/shared';

// Import shared types in backend
import { CreateSessionDto, SessionResponse } from '@atlas/shared';
```

## Structure

```
shared/
├── types/
│   ├── user.types.ts           # User roles, permissions
│   ├── cohort.types.ts         # Cohort states
│   ├── session.types.ts        # Session types
│   ├── resource.types.ts       # Resource states, types
│   ├── progress.types.ts       # Progress tracking
│   ├── gamification.types.ts   # Points, achievements
│   ├── discussion.types.ts     # Discussion threads
│   ├── quiz.types.ts           # Quiz system
│   ├── analytics.types.ts      # Event types
│   └── api.types.ts            # API contracts
├── constants/
│   ├── points.constants.ts     # Point values
│   ├── thresholds.constants.ts # Completion thresholds
│   └── errors.constants.ts     # Error codes
├── enums/
│   ├── role.enum.ts            # User roles
│   ├── resource-state.enum.ts  # Resource states
│   └── event-type.enum.ts      # Analytics events
└── index.ts                    # Main export
```

## Key Types to Define

### User Roles
```typescript
enum UserRole {
  FELLOW = 'FELLOW',
  FACILITATOR = 'FACILITATOR',
  ADMIN = 'ADMIN'
}
```

### Resource States
```typescript
enum ResourceState {
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}
```

### Cohort States
```typescript
enum CohortState {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}
```

### Event Types
```typescript
enum EventType {
  RESOURCE_OPENED = 'RESOURCE_OPENED',
  SCROLL_DEPTH = 'SCROLL_DEPTH',
  VIDEO_PROGRESS = 'VIDEO_PROGRESS',
  RESOURCE_COMPLETED = 'RESOURCE_COMPLETED',
  DISCUSSION_POSTED = 'DISCUSSION_POSTED',
  QUIZ_SUBMITTED = 'QUIZ_SUBMITTED',
  // ... more events
}
```

## Installation

This will be a local package referenced by both frontend and backend:

```json
// frontend/package.json
{
  "dependencies": {
    "@atlas/shared": "workspace:*"
  }
}

// backend/package.json
{
  "dependencies": {
    "@atlas/shared": "workspace:*"
  }
}
```

## Features to Implement

- [ ] User role enums and types
- [ ] Resource state enums
- [ ] Cohort state enums
- [ ] API request/response interfaces
- [ ] Event type enums with metadata types
- [ ] Gamification types (points, achievements)
- [ ] Discussion and chat types
- [ ] Quiz types
- [ ] Error code constants
- [ ] Validation schemas (Zod)
