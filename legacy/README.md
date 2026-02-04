# Legacy Website

This directory contains the original simple resource viewer website that was built as a prototype. It has been archived as the platform is being rebuilt into a full gamified LMS.

## Contents

- `client/` - React + Vite frontend (static resource viewer)
- `server/` - Express backend (minimal)
- `components.json` - Shadcn UI configuration
- `vite.config.ts` - Vite build configuration
- `patches/` - Package patches for wouter routing

## What This Was

A simple, static website that displayed 91 career development resources organized by month and session. It featured:
- Month/session navigation
- Article and video resource cards
- YouTube/Vimeo video player modal
- Article link opener
- Search and filter functionality
- ATLAS branding (#0b0b45 color, Montserrat font)
- THRiVE Hub mission statement

## Why It Was Replaced

The platform requirements evolved to include:
- User authentication and role-based access
- Resource locking and engagement tracking
- Gamification (points, achievements, leaderboards)
- Social learning (discussions, chat)
- Live quizzes with real-time rankings
- Session analytics with AI analysis
- Anti-skimming validation
- Admin control panel

These requirements necessitate a complete rebuild with:
- Backend API (NestJS)
- Database (PostgreSQL + Redis)
- AI services (Python microservices)
- Modern frontend (Next.js)

## Historical Note

This website served as the initial prototype to visualize the curriculum and resources. It successfully demonstrated the user interface concept and ATLAS branding before the full platform development began.

Last updated: February 4, 2026
