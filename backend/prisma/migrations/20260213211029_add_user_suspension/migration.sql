/*
  Warnings:

  - You are about to drop the column `facilitatorId` on the `cohorts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "cohorts" DROP CONSTRAINT "cohorts_facilitatorId_fkey";

-- DropIndex
DROP INDEX "cohorts_facilitatorId_idx";

-- AlterTable
ALTER TABLE "cohorts" DROP COLUMN "facilitatorId";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isFacilitator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "cohort_facilitators" (
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "cohort_facilitators_pkey" PRIMARY KEY ("cohortId","userId")
);

-- CreateIndex
CREATE INDEX "cohort_facilitators_cohortId_idx" ON "cohort_facilitators"("cohortId");

-- CreateIndex
CREATE INDEX "cohort_facilitators_userId_idx" ON "cohort_facilitators"("userId");

-- AddForeignKey
ALTER TABLE "cohort_facilitators" ADD CONSTRAINT "cohort_facilitators_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cohort_facilitators" ADD CONSTRAINT "cohort_facilitators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
