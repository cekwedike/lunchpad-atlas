# Frontend - ATLAS Platform

Next.js frontend application for the ATLAS gamified learning platform.

## Tech Stack

- **Next.js 14+** with App Router
- **TypeScript** - Type-safe development
- **React Query** - Server state management
- **Zustand** - Client state management
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Radix UI** - Accessible primitives

## Directory Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login, register)
│   ├── dashboard/
│   │   ├── fellow/       # Fellow dashboard
│   │   ├── facilitator/  # Facilitator dashboard
│   │   └── admin/        # Admin dashboard
│   ├── resources/        # Resource viewer pages
│   ├── leaderboard/      # Leaderboard page
│   ├── discussions/      # Discussion threads
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── dashboard/        # Dashboard-specific components
│   ├── resources/        # Resource viewer components
│   └── shared/           # Shared components
├── lib/                   # Utilities
│   ├── api/              # API client functions
│   ├── utils.ts          # Helper functions
│   └── constants.ts      # Constants
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts        # Authentication hook
│   ├── useResources.ts   # Resource management
│   └── useGamefication.ts # Points/achievements
├── stores/                # Zustand stores
│   ├── authStore.ts      # Auth state
│   └── uiStore.ts        # UI state
├── types/                 # TypeScript types
└── public/                # Static assets
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

## Features to Implement

- [ ] Authentication UI (login/register)
- [ ] Role-based routing (Fellow/Facilitator/Admin)
- [ ] Fellow Dashboard (resources, progress, leaderboard)
- [ ] Resource viewer with engagement tracking
- [ ] Discussion threads with word counter
- [ ] Live quiz interface with countdown
- [ ] Leaderboard with monthly rankings
- [ ] Chat interface
- [ ] Admin dashboard (cohort/user/resource management)
- [ ] Facilitator dashboard (session analytics)
- [ ] Session analytics interface

## Design System

- **Primary Color**: #0b0b45 (ATLAS Navy)
- **Font**: Montserrat (headings), Inter (body)
- **Theme**: Professional, modern, mission-driven
- **Responsive**: Tablet and laptop optimized
