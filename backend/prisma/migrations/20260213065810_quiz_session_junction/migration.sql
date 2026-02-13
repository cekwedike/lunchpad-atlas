/*
  Warnings:

  - You are about to drop the column `sessionId` on the `quizzes` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "quizzes" DROP CONSTRAINT "quizzes_sessionId_fkey";

-- DropIndex
DROP INDEX "quizzes_sessionId_idx";

-- AlterTable
ALTER TABLE "quizzes" DROP COLUMN "sessionId";

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "quizId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("quizId","sessionId")
);

-- CreateIndex
CREATE INDEX "quiz_sessions_sessionId_idx" ON "quiz_sessions"("sessionId");

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
