/*
  Warnings:

  - You are about to drop the column `sessionId` on the `live_quizzes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "live_quizzes" DROP CONSTRAINT "live_quizzes_sessionId_fkey";

-- DropIndex
DROP INDEX "live_quizzes_sessionId_idx";

-- AlterTable
ALTER TABLE "live_quizzes" DROP COLUMN "sessionId";

-- CreateTable
CREATE TABLE "live_quiz_sessions" (
    "id" TEXT NOT NULL,
    "liveQuizId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "live_quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "live_quiz_sessions_liveQuizId_idx" ON "live_quiz_sessions"("liveQuizId");

-- CreateIndex
CREATE INDEX "live_quiz_sessions_sessionId_idx" ON "live_quiz_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "live_quiz_sessions_liveQuizId_sessionId_key" ON "live_quiz_sessions"("liveQuizId", "sessionId");

-- AddForeignKey
ALTER TABLE "live_quiz_sessions" ADD CONSTRAINT "live_quiz_sessions_liveQuizId_fkey" FOREIGN KEY ("liveQuizId") REFERENCES "live_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_quiz_sessions" ADD CONSTRAINT "live_quiz_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
