-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quizzes" ADD COLUMN "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT false;
