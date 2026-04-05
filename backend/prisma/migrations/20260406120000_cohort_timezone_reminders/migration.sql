-- AlterTable
ALTER TABLE "cohorts" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateEnum
CREATE TYPE "ReminderDispatchKind" AS ENUM ('SESSION_UPCOMING', 'QUIZ_CLOSING', 'INCOMPLETE_RESOURCE');

-- CreateTable
CREATE TABLE "resource_date_unlock_notifications" (
    "resourceId" TEXT NOT NULL,
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_date_unlock_notifications_pkey" PRIMARY KEY ("resourceId")
);

-- CreateTable
CREATE TABLE "reminder_dispatches" (
    "id" TEXT NOT NULL,
    "kind" "ReminderDispatchKind" NOT NULL,
    "userId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_dispatches_kind_userId_entityId_key" ON "reminder_dispatches"("kind", "userId", "entityId");

-- CreateIndex
CREATE INDEX "reminder_dispatches_userId_idx" ON "reminder_dispatches"("userId");

-- AddForeignKey
ALTER TABLE "resource_date_unlock_notifications" ADD CONSTRAINT "resource_date_unlock_notifications_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_dispatches" ADD CONSTRAINT "reminder_dispatches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
