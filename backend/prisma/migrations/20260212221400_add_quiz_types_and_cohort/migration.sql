-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('SESSION', 'GENERAL', 'MEGA');

-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_sessionId_fkey";

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "cohortId" TEXT,
ADD COLUMN     "quizType" "QuizType" NOT NULL DEFAULT 'SESSION',
ALTER COLUMN "sessionId" DROP NOT NULL,
ALTER COLUMN "timeLimit" SET DEFAULT 0,
ALTER COLUMN "passingScore" SET DEFAULT 70;

-- CreateIndex
CREATE INDEX "quizzes_cohortId_idx" ON "quizzes"("cohortId");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
