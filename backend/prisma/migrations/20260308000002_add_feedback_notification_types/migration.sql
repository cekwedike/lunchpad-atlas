-- AlterEnum: add feedback notification types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FEEDBACK_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'FEEDBACK_RESPONDED';
