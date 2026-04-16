-- CreateEnum
CREATE TYPE "CohortLeadershipRole" AS ENUM ('NONE', 'COHORT_CAPTAIN', 'ASSISTANT_COHORT_CAPTAIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "cohortLeadershipRole" "CohortLeadershipRole" NOT NULL DEFAULT 'NONE';

-- AlterEnum (append new values; order is append-only in PostgreSQL)
ALTER TYPE "ReminderDispatchKind" ADD VALUE 'QUIZ_UNLOCK_EMAIL';
ALTER TYPE "ReminderDispatchKind" ADD VALUE 'QUIZ_CLOSING_7D';
ALTER TYPE "ReminderDispatchKind" ADD VALUE 'QUIZ_CLOSING_3D';
ALTER TYPE "ReminderDispatchKind" ADD VALUE 'QUIZ_CLOSING_1D';

ALTER TYPE "NotificationType" ADD VALUE 'QUIZ_UNLOCKED';
