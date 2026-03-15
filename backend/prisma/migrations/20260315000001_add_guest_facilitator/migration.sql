-- Add GUEST_FACILITATOR to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GUEST_FACILITATOR';

-- Add guestAccessExpiresAt to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "guestAccessExpiresAt" TIMESTAMP(3);

-- Create guest_sessions junction table
CREATE TABLE IF NOT EXISTS "guest_sessions" (
    "userId"    TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "guest_sessions_pkey" PRIMARY KEY ("userId", "sessionId")
);

CREATE INDEX IF NOT EXISTS "guest_sessions_userId_idx"    ON "guest_sessions"("userId");
CREATE INDEX IF NOT EXISTS "guest_sessions_sessionId_idx" ON "guest_sessions"("sessionId");

ALTER TABLE "guest_sessions"
    ADD CONSTRAINT "guest_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "guest_sessions"
    ADD CONSTRAINT "guest_sessions_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
