-- Fix production schema drift causing Prisma P2022 errors.
-- This migration is intentionally defensive (IF NOT EXISTS / DO blocks) so it can be applied safely.

-- 1) Enum value needed for mention notifications
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_MENTION';

-- 2) Threading / replies
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "parentMessageId" TEXT;

-- 3) Reactions
CREATE TABLE IF NOT EXISTS "chat_message_reactions" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "emoji" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_reactions_pkey" PRIMARY KEY ("id")
);

-- 4) Mentions
CREATE TABLE IF NOT EXISTS "chat_message_mentions" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "mentionedUserId" TEXT NOT NULL,
  "mentionedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_message_mentions_pkey" PRIMARY KEY ("id")
);

-- 5) Read receipts / membership
CREATE TABLE IF NOT EXISTS "channel_members" (
  "id" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "chat_message_reactions_messageId_idx" ON "chat_message_reactions"("messageId");
CREATE INDEX IF NOT EXISTS "chat_message_reactions_userId_idx" ON "chat_message_reactions"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "chat_message_reactions_messageId_userId_emoji_key"
  ON "chat_message_reactions"("messageId", "userId", "emoji");

CREATE INDEX IF NOT EXISTS "chat_message_mentions_messageId_idx" ON "chat_message_mentions"("messageId");
CREATE INDEX IF NOT EXISTS "chat_message_mentions_mentionedUserId_idx" ON "chat_message_mentions"("mentionedUserId");
CREATE INDEX IF NOT EXISTS "chat_message_mentions_mentionedByUserId_idx" ON "chat_message_mentions"("mentionedByUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "chat_message_mentions_messageId_mentionedUserId_key"
  ON "chat_message_mentions"("messageId", "mentionedUserId");

CREATE INDEX IF NOT EXISTS "channel_members_channelId_idx" ON "channel_members"("channelId");
CREATE INDEX IF NOT EXISTS "channel_members_userId_idx" ON "channel_members"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "channel_members_channelId_userId_key"
  ON "channel_members"("channelId", "userId");

CREATE INDEX IF NOT EXISTS "chat_messages_parentMessageId_idx" ON "chat_messages"("parentMessageId");

-- Foreign keys (Postgres doesn't support IF NOT EXISTS on ADD CONSTRAINT; use DO blocks)
DO $$
BEGIN
  ALTER TABLE "chat_messages"
    ADD CONSTRAINT "chat_messages_parentMessageId_fkey"
    FOREIGN KEY ("parentMessageId") REFERENCES "chat_messages"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_message_reactions"
    ADD CONSTRAINT "chat_message_reactions_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_message_reactions"
    ADD CONSTRAINT "chat_message_reactions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_message_mentions"
    ADD CONSTRAINT "chat_message_mentions_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_message_mentions"
    ADD CONSTRAINT "chat_message_mentions_mentionedUserId_fkey"
    FOREIGN KEY ("mentionedUserId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "chat_message_mentions"
    ADD CONSTRAINT "chat_message_mentions_mentionedByUserId_fkey"
    FOREIGN KEY ("mentionedByUserId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "channel_members"
    ADD CONSTRAINT "channel_members_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "channels"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "channel_members"
    ADD CONSTRAINT "channel_members_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

