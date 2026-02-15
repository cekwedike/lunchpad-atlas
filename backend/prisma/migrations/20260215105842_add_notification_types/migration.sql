-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DISCUSSION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'DISCUSSION_PENDING';
ALTER TYPE "NotificationType" ADD VALUE 'POINTS_ADJUSTED';
ALTER TYPE "NotificationType" ADD VALUE 'USER_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE 'USER_UNSUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE 'QUIZ_STARTED';
ALTER TYPE "NotificationType" ADD VALUE 'ANTI_SKIMMING_WARNING';
ALTER TYPE "NotificationType" ADD VALUE 'FELLOW_INACTIVITY';
ALTER TYPE "NotificationType" ADD VALUE 'FELLOW_MISSED_SESSIONS';
ALTER TYPE "NotificationType" ADD VALUE 'FELLOW_LOW_ENGAGEMENT';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "monthlyPointsCap" SET DEFAULT 2500;
