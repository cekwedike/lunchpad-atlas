-- Persist "Getting started" checklist state on the user (not only localStorage)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboardingChecklistDismissed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboardingTourCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboardingNotifReviewed" BOOLEAN NOT NULL DEFAULT false;
