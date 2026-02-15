-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PASSWORD_CHANGED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);
