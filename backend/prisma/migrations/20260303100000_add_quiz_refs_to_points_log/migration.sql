-- Add quizId and liveQuizId to points_log for cascade-delete when quiz is removed

ALTER TABLE "points_log" ADD COLUMN "quizId" TEXT;
ALTER TABLE "points_log" ADD COLUMN "liveQuizId" TEXT;

-- Foreign keys with cascade delete
ALTER TABLE "points_log"
  ADD CONSTRAINT "points_log_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "points_log"
  ADD CONSTRAINT "points_log_liveQuizId_fkey"
  FOREIGN KEY ("liveQuizId") REFERENCES "live_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for efficient lookup
CREATE INDEX "points_log_quizId_idx" ON "points_log"("quizId");
CREATE INDEX "points_log_liveQuizId_idx" ON "points_log"("liveQuizId");
